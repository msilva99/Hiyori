//! AI Tutor backend: OS-keyring secret storage, on-demand asset downloads with
//! checksum verification, and the local llama.cpp inference server lifecycle.

use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use futures_util::StreamExt;
use serde::Serialize;
use sha2::{Digest, Sha256};
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager, Runtime, State};
use tokio::io::AsyncWriteExt;

const KEYRING_SERVICE: &str = "hiyori-ai-tutor";

// --------------------------------------------------------------------------
// Local server state + shutdown
// --------------------------------------------------------------------------

#[derive(Default)]
pub struct LocalServerState(pub Mutex<Option<LocalServer>>);

pub struct LocalServer {
    child: Child,
    port: u16,
    model: String,
}

/// Kill the child on app exit so it never outlives the window (also covers the
/// updater relaunch path).
pub fn kill_local_server<R: Runtime>(app: &AppHandle<R>) {
    if let Some(state) = app.try_state::<LocalServerState>() {
        if let Ok(mut guard) = state.0.lock() {
            if let Some(mut server) = guard.take() {
                let _ = server.child.kill();
                let _ = server.child.wait();
            }
        }
    }
}

// --------------------------------------------------------------------------
// Paths + helpers
// --------------------------------------------------------------------------

fn ai_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let base = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    Ok(base.join("ai"))
}

fn llama_server_filename() -> &'static str {
    #[cfg(windows)]
    {
        "llama-server.exe"
    }
    #[cfg(not(windows))]
    {
        "llama-server"
    }
}

/// Reject anything that isn't a bare filename living directly in the target dir.
fn sanitize_filename(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    let looks_nested = trimmed.is_empty()
        || trimmed.contains('/')
        || trimmed.contains('\\')
        || trimmed.contains("..")
        || trimmed.contains(':')
        || Path::new(trimmed).file_name().map(|f| f != trimmed).unwrap_or(true);
    if looks_nested {
        return Err(format!("Invalid asset filename: {name}"));
    }
    Ok(trimmed.to_string())
}

fn is_allowed_download_host(url: &str) -> bool {
    match reqwest::Url::parse(url) {
        Ok(parsed) => {
            parsed.scheme() == "https"
                && parsed.host_str().is_some_and(|host| {
                    host == "github.com"
                        || host == "objects.githubusercontent.com"
                        || host.ends_with(".githubusercontent.com")
                        || host == "huggingface.co"
                        || host.ends_with(".huggingface.co")
                        || host.ends_with(".hf.co")
                })
        }
        Err(_) => false,
    }
}

fn hex_encode(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push_str(&format!("{byte:02x}"));
    }
    out
}

// --------------------------------------------------------------------------
// Asset paths / presence
// --------------------------------------------------------------------------

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiPaths {
    dir: String,
    runtime_present: bool,
    model_present: bool,
}

#[tauri::command]
pub fn ai_asset_paths<R: Runtime>(app: AppHandle<R>) -> Result<AiPaths, String> {
    let dir = ai_dir(&app)?;
    let bin_dir = dir.join("bin");
    let models_dir = dir.join("models");
    std::fs::create_dir_all(&bin_dir).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&models_dir).map_err(|e| e.to_string())?;

    let runtime_present = bin_dir.join(llama_server_filename()).exists();
    let model_present = std::fs::read_dir(&models_dir)
        .map(|entries| {
            entries
                .flatten()
                .any(|entry| entry.path().extension().is_some_and(|ext| ext == "gguf"))
        })
        .unwrap_or(false);

    Ok(AiPaths {
        dir: dir.display().to_string(),
        runtime_present,
        model_present,
    })
}

// --------------------------------------------------------------------------
// Download + verify
// --------------------------------------------------------------------------

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "phase")]
pub enum DownloadProgress {
    Started { downloaded: u64, total: u64 },
    Progress { downloaded: u64, total: u64 },
    Verifying { downloaded: u64, total: u64 },
    Finished { downloaded: u64, total: u64 },
}

#[tauri::command]
pub async fn ai_download_asset<R: Runtime>(
    app: AppHandle<R>,
    kind: String,
    filename: String,
    url: String,
    expected_sha256: String,
    on_progress: Channel<DownloadProgress>,
) -> Result<(), String> {
    if !is_allowed_download_host(&url) {
        return Err(format!("Refusing to download from an unapproved host: {url}"));
    }
    let safe_name = sanitize_filename(&filename)?;

    let dir = ai_dir(&app)?;
    let target_dir = match kind.as_str() {
        "runtime" => dir.join("bin"),
        "model" => dir.join("models"),
        other => return Err(format!("Unknown asset kind: {other}")),
    };
    tokio::fs::create_dir_all(&target_dir)
        .await
        .map_err(|e| e.to_string())?;

    let final_path = target_dir.join(&safe_name);
    let part_path = target_dir.join(format!("{safe_name}.part"));

    let response = reqwest::Client::new()
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Download failed: HTTP {}", response.status()));
    }
    let total = response.content_length().unwrap_or(0);
    let _ = on_progress.send(DownloadProgress::Started { downloaded: 0, total });

    let mut file = tokio::fs::File::create(&part_path)
        .await
        .map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut downloaded: u64 = 0;
    let mut last_emit = Instant::now();
    let mut last_pct: i64 = -1;

    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        hasher.update(&chunk);
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;

        // Throttle: at most every ~250ms, or whenever the whole-percent changes.
        let pct = downloaded
            .saturating_mul(100)
            .checked_div(total)
            .map_or(-1, |value| value as i64);
        if last_emit.elapsed() >= Duration::from_millis(250) || (pct >= 0 && pct != last_pct) {
            last_emit = Instant::now();
            last_pct = pct;
            let _ = on_progress.send(DownloadProgress::Progress { downloaded, total });
        }
    }
    file.flush().await.map_err(|e| e.to_string())?;
    drop(file);

    let _ = on_progress.send(DownloadProgress::Verifying { downloaded, total });
    let actual = hex_encode(&hasher.finalize());
    if !expected_sha256.is_empty() && !actual.eq_ignore_ascii_case(expected_sha256.trim()) {
        let _ = tokio::fs::remove_file(&part_path).await;
        return Err(format!(
            "Checksum mismatch: expected {expected_sha256}, got {actual}."
        ));
    }

    if kind == "runtime" {
        // The verified .part is the llama.cpp zip: extract every file (flattened)
        // into bin/, then drop the archive.
        let archive = part_path.clone();
        let dest = target_dir.clone();
        tokio::task::spawn_blocking(move || extract_zip_flat(&archive, &dest))
            .await
            .map_err(|e| e.to_string())??;
        let _ = tokio::fs::remove_file(&part_path).await;

        let server_bin = target_dir.join(llama_server_filename());
        if !server_bin.exists() {
            return Err("The runtime archive didn't contain llama-server.".into());
        }
        tokio::fs::write(target_dir.join("runtime.sha256"), &actual)
            .await
            .map_err(|e| e.to_string())?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = std::fs::metadata(&server_bin)
                .map_err(|e| e.to_string())?
                .permissions();
            perms.set_mode(0o755);
            std::fs::set_permissions(&server_bin, perms).map_err(|e| e.to_string())?;
        }
    } else {
        if final_path.exists() {
            let _ = tokio::fs::remove_file(&final_path).await;
        }
        tokio::fs::rename(&part_path, &final_path)
            .await
            .map_err(|e| e.to_string())?;
        tokio::fs::write(target_dir.join(format!("{safe_name}.sha256")), &actual)
            .await
            .map_err(|e| e.to_string())?;
    }

    let _ = on_progress.send(DownloadProgress::Finished { downloaded, total });
    Ok(())
}

/// Extract every file entry of a zip into `dest_dir`, flattening any internal
/// directory structure. Using only the entry basename also blocks path traversal.
fn extract_zip_flat(zip_path: &Path, dest_dir: &Path) -> Result<(), String> {
    let file = std::fs::File::open(zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(|e| e.to_string())?;
        if entry.is_dir() {
            continue;
        }
        let raw = entry.name().replace('\\', "/");
        let base = raw.rsplit('/').next().unwrap_or("");
        if base.is_empty() {
            continue;
        }
        let out_path = dest_dir.join(base);
        let mut out = std::fs::File::create(&out_path).map_err(|e| e.to_string())?;
        std::io::copy(&mut entry, &mut out).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn ai_asset_remove<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, LocalServerState>,
    kind: String,
) -> Result<(), String> {
    let dir = ai_dir(&app)?;
    match kind.as_str() {
        "runtime" => {
            let bin_dir = dir.join("bin");
            let _ = std::fs::remove_dir_all(&bin_dir);
            let _ = std::fs::create_dir_all(&bin_dir);
        }
        "model" => {
            if let Some(mut server) = state.0.lock().map_err(|_| "server state poisoned")?.take() {
                let _ = server.child.kill();
                let _ = server.child.wait();
            }
            if let Ok(entries) = std::fs::read_dir(dir.join("models")) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
                    if ext == "gguf" || ext == "sha256" || ext == "part" {
                        let _ = std::fs::remove_file(path);
                    }
                }
            }
        }
        other => return Err(format!("Unknown asset kind: {other}")),
    }
    Ok(())
}

// --------------------------------------------------------------------------
// Local server lifecycle
// --------------------------------------------------------------------------

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerInfo {
    port: u16,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerStatusReply {
    running: bool,
    port: Option<u16>,
    model: Option<String>,
}

fn free_loopback_port() -> Result<u16, String> {
    let listener = std::net::TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    drop(listener);
    Ok(port)
}

async fn health_ok(port: u16, timeout: Duration) -> bool {
    reqwest::Client::new()
        .get(format!("http://127.0.0.1:{port}/health"))
        .timeout(timeout)
        .send()
        .await
        .map(|response| response.status().is_success())
        .unwrap_or(false)
}

#[tauri::command]
pub async fn ai_local_server_start<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, LocalServerState>,
    model_filename: String,
    ctx_size: u32,
) -> Result<ServerInfo, String> {
    if state.0.lock().map_err(|_| "server state poisoned")?.is_some() {
        return Err("The local model server is already running.".into());
    }

    let safe_model = sanitize_filename(&model_filename)?;
    let dir = ai_dir(&app)?;
    let bin_dir = dir.join("bin");
    let bin = bin_dir.join(llama_server_filename());
    let model_path = dir.join("models").join(&safe_model);
    if !bin.exists() {
        return Err("The inference runtime isn't downloaded yet.".into());
    }
    if !model_path.exists() {
        return Err("The model file isn't downloaded yet.".into());
    }

    let port = free_loopback_port()?;

    // Capture stdout+stderr to one file. llama.cpp writes device enumeration and
    // tensor-offload info to stderr, which --log-file does not capture, so redirect
    // the streams directly instead of using --log-file.
    let log_path = dir.join("llama.log");
    let log_out = std::fs::File::create(&log_path).map_err(|e| e.to_string())?;
    let log_err = log_out.try_clone().map_err(|e| e.to_string())?;

    let mut command = Command::new(&bin);
    command
        // Run from bin/ so Windows resolves the sibling ggml/llama DLLs.
        .current_dir(&bin_dir)
        .arg("-m")
        .arg(&model_path)
        .arg("--host")
        .arg("127.0.0.1")
        .arg("--port")
        .arg(port.to_string())
        .arg("-c")
        .arg(ctx_size.to_string())
        // Offload as many layers to the GPU as fit; a no-op on the CPU fallback.
        .arg("--n-gpu-layers")
        .arg("99")
        .arg("--jinja")
        .arg("--no-webui")
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::from(log_out))
        .stderr(std::process::Stdio::from(log_err));

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = command
        .spawn()
        .map_err(|e| format!("Couldn't start the model server: {e}"))?;

    // Poll /health for up to 180s while the model loads into memory.
    let mut ready = false;
    for _ in 0..360 {
        tokio::time::sleep(Duration::from_millis(500)).await;
        if health_ok(port, Duration::from_millis(400)).await {
            ready = true;
            break;
        }
    }

    if !ready {
        let _ = child.kill();
        let _ = child.wait();
        return Err("The model server didn't become ready in time.".into());
    }

    *state.0.lock().map_err(|_| "server state poisoned")? = Some(LocalServer {
        child,
        port,
        model: safe_model,
    });
    Ok(ServerInfo { port })
}

#[tauri::command]
pub fn ai_local_server_stop(state: State<'_, LocalServerState>) -> Result<(), String> {
    if let Some(mut server) = state.0.lock().map_err(|_| "server state poisoned")?.take() {
        let _ = server.child.kill();
        let _ = server.child.wait();
    }
    Ok(())
}

#[tauri::command]
pub async fn ai_local_server_status(
    state: State<'_, LocalServerState>,
) -> Result<ServerStatusReply, String> {
    let snapshot = {
        let guard = state.0.lock().map_err(|_| "server state poisoned")?;
        guard.as_ref().map(|server| (server.port, server.model.clone()))
    };

    let Some((port, model)) = snapshot else {
        return Ok(ServerStatusReply {
            running: false,
            port: None,
            model: None,
        });
    };

    if health_ok(port, Duration::from_secs(2)).await {
        return Ok(ServerStatusReply {
            running: true,
            port: Some(port),
            model: Some(model),
        });
    }

    // The process is gone or wedged - clear it so the UI can offer a restart.
    if let Some(mut server) = state.0.lock().map_err(|_| "server state poisoned")?.take() {
        let _ = server.child.kill();
        let _ = server.child.wait();
    }
    Ok(ServerStatusReply {
        running: false,
        port: None,
        model: None,
    })
}

// --------------------------------------------------------------------------
// Keyring
// --------------------------------------------------------------------------

fn keyring_entry(provider: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, provider).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn ai_secret_set(provider: String, secret: String) -> Result<(), String> {
    keyring_entry(&provider)?
        .set_password(&secret)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn ai_secret_get(provider: String) -> Result<Option<String>, String> {
    match keyring_entry(&provider)?.get_password() {
        Ok(secret) => Ok(Some(secret)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn ai_secret_delete(provider: String) -> Result<(), String> {
    match keyring_entry(&provider)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
