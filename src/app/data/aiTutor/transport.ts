import { isTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

function isLoopback(url: string): boolean {
   try {
      const host = new URL(url).hostname;
      return host === "127.0.0.1" || host === "localhost" || host === "[::1]";
   } catch {
      return false;
   }
}

// Loopback calls (the local inference server) use the webview's native fetch: it
// streams reliably and AbortController just works. Remote BYOK calls go through the
// Tauri HTTP plugin, which runs the request in Rust - no CORS, and the capability
// URL allowlist is the egress filter.
export function streamingFetch(url: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
   const useTauriHttp = isTauri() && !isLoopback(url);
   const impl = useTauriHttp ? tauriFetch : globalThis.fetch.bind(globalThis);
   return impl(url, { ...init, signal });
}
