import { invoke, isTauri } from "@tauri-apps/api/core";
import type { ByokProvider } from "../../store/settingsStore";

// The API key lives in the OS keyring, reachable only through these Rust commands.
// It is never written to a store, localStorage, a log, or a URL.

export async function getApiKey(provider: ByokProvider): Promise<string | null> {
   if (!isTauri()) return null;
   const value = await invoke<string | null>("ai_secret_get", { provider });
   return value ?? null;
}

export async function setApiKey(provider: ByokProvider, secret: string): Promise<void> {
   await invoke("ai_secret_set", { provider, secret });
}

export async function deleteApiKey(provider: ByokProvider): Promise<void> {
   await invoke("ai_secret_delete", { provider });
}
