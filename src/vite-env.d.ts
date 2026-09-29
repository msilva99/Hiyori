/// <reference types="vite/client" />

declare module "*.css";
declare module 'react-dom/client';

interface ImportMetaEnv {
   // Base URL of the Hiyori Deck API. Unset in dev → falls back to the local API
   // (http://127.0.0.1:8000); set to the deployed URL for a production build.
   readonly VITE_DECKS_API_URL?: string;
}

interface ImportMeta {
   readonly env: ImportMetaEnv;
}
