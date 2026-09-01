import { create } from "zustand";
import { Channel, invoke, isTauri } from "@tauri-apps/api/core";
import { GEMMA_MODEL, LLAMA_SERVER } from "../data/aiTutor/localAssets";
import { useSettingsStore } from "./settingsStore";

export type ServerStatus = "stopped" | "starting" | "running" | "error";
type DownloadPhase = "idle" | "downloading" | "verifying" | "done" | "error";

export type DownloadState = {
   phase: DownloadPhase;
   // 0-100, or -1 when the total size is unknown.
   percent: number;
   error: string | null;
};

type AssetKind = "runtime" | "model";

// Matches the Rust ai_download_asset progress channel.
type DownloadProgress = {
   phase: "started" | "progress" | "verifying" | "finished";
   downloaded: number;
   total: number;
};

type ServerInfo = { port: number };
type ServerStatusReply = { running: boolean; port: number | null; model: string | null };

const idle: DownloadState = { phase: "idle", percent: 0, error: null };

type AiLocalServerStore = {
   serverStatus: ServerStatus;
   port: number | null;
   serverError: string | null;
   downloads: Record<AssetKind, DownloadState>;

   refreshStatus: () => Promise<void>;
   download: (kind: AssetKind) => Promise<void>;
   removeAsset: (kind: AssetKind) => Promise<void>;
   startServer: () => Promise<void>;
   stopServer: () => Promise<void>;
};

function toPercent(progress: DownloadProgress): number {
   if (progress.total <= 0) return -1;
   return Math.min(100, Math.round((progress.downloaded / progress.total) * 100));
}

export const useAiLocalServerStore = create<AiLocalServerStore>((set, get) => ({
   serverStatus: "stopped",
   port: null,
   serverError: null,
   downloads: { runtime: idle, model: idle },

   refreshStatus: async () => {
      if (!isTauri()) return;
      try {
         const reply = await invoke<ServerStatusReply>("ai_local_server_status");
         set({
            serverStatus: reply.running ? "running" : "stopped",
            port: reply.port,
            serverError: null,
         });
      } catch (err) {
         set({ serverStatus: "error", serverError: describe(err) });
      }
   },

   download: async (kind) => {
      const asset = kind === "runtime" ? LLAMA_SERVER : GEMMA_MODEL;
      set((state) => ({
         downloads: { ...state.downloads, [kind]: { phase: "downloading", percent: -1, error: null } },
      }));

      const channel = new Channel<DownloadProgress>();
      channel.onmessage = (progress) => {
         set((state) => ({
            downloads: {
               ...state.downloads,
               [kind]: {
                  phase: progress.phase === "verifying" ? "verifying" : "downloading",
                  percent: toPercent(progress),
                  error: null,
               },
            },
         }));
      };

      try {
         await invoke("ai_download_asset", {
            kind,
            filename: asset.filename,
            url: asset.url,
            expectedSha256: asset.sha256,
            onProgress: channel,
         });
         set((state) => ({
            downloads: { ...state.downloads, [kind]: { phase: "done", percent: 100, error: null } },
         }));
         const setReady =
            kind === "runtime"
               ? useSettingsStore.getState().setLocalRuntimeReady
               : useSettingsStore.getState().setLocalModelReady;
         setReady(true);
      } catch (err) {
         set((state) => ({
            downloads: { ...state.downloads, [kind]: { phase: "error", percent: 0, error: describe(err) } },
         }));
      }
   },

   removeAsset: async (kind) => {
      if (!isTauri()) return;
      await invoke("ai_asset_remove", { kind });
      set((state) => ({ downloads: { ...state.downloads, [kind]: idle } }));
      const settings = useSettingsStore.getState();
      if (kind === "runtime") settings.setLocalRuntimeReady(false);
      else settings.setLocalModelReady(false);
      if (kind === "model") await get().stopServer();
   },

   startServer: async () => {
      if (!isTauri()) return;
      set({ serverStatus: "starting", serverError: null });
      try {
         const info = await invoke<ServerInfo>("ai_local_server_start", {
            modelFilename: GEMMA_MODEL.filename,
            ctxSize: 4096,
         });
         set({ serverStatus: "running", port: info.port, serverError: null });
      } catch (err) {
         set({ serverStatus: "error", serverError: describe(err), port: null });
      }
   },

   stopServer: async () => {
      if (!isTauri()) return;
      try {
         await invoke("ai_local_server_stop");
      } finally {
         set({ serverStatus: "stopped", port: null });
      }
   },
}));

function describe(err: unknown): string {
   if (typeof err === "string") return err;
   if (err instanceof Error) return err.message;
   return "Something went wrong.";
}
