mod ai;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .manage(ai::LocalServerState::default())
        .invoke_handler(tauri::generate_handler![
            ai::ai_asset_paths,
            ai::ai_download_asset,
            ai::ai_asset_remove,
            ai::ai_local_server_start,
            ai::ai_local_server_stop,
            ai::ai_local_server_status,
            ai::ai_secret_set,
            ai::ai_secret_get,
            ai::ai_secret_delete,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit = event {
                ai::kill_local_server(app_handle);
            }
        });
}
