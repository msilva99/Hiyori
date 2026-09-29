import { isTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

// In the packaged desktop app, requests go through the Tauri HTTP plugin, which
// runs them in Rust: no CORS, and the webview CSP's connect-src doesn't apply -
// the capability URL allowlist (src-tauri/capabilities/desktop.json) is the egress
// filter instead. In the browser build there's no plugin, so use native fetch and
// rely on the API's CORS allowlist. Same split as ../aiTutor/transport.ts, minus
// the loopback special-case (these calls don't stream).
export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
   const impl = isTauri() ? tauriFetch : globalThis.fetch.bind(globalThis);
   return impl(url, init);
}
