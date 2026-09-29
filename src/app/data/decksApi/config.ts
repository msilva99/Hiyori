// Single source of the Hiyori Deck API base URL. The contract doc asks consumers to
// keep this in one place rather than hardcoding it per call.
//
// Unset VITE_DECKS_API_URL → local dev API. Set it (e.g. in a .env or the build env)
// to the deployed Vercel URL for a production build. Any trailing slash is trimmed so
// callers can safely template `${DECKS_API_URL}/decks/`.
export const DECKS_API_URL =
   import.meta.env.VITE_DECKS_API_URL?.replace(/\/+$/, "") ?? "http://127.0.0.1:8000";
