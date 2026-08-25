import { create } from "zustand";
import { isTauri } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type UpdaterStatus = "idle" | "checking" | "up-to-date" | "available" | "downloading" | "ready" | "error";

interface UpdaterState {
   status: UpdaterStatus;
   update: Update | null;
   // -1 means the download is in progress but its total size is unknown, so progress can't be a percentage.
   progress: number;
   error: string | null;
   // Tracks whether the update flow has been surfaced to the user (i.e. an update was found).
   // A silent startup check that finds nothing, or fails, should never flip this to true.
   hasSurfaced: boolean;

   checkForUpdates: () => Promise<void>;
   installUpdate: () => Promise<void>;
   dismiss: () => void;
}

export const useUpdaterStore = create<UpdaterState>((set, get) => ({
   status: "idle",
   update: null,
   progress: 0,
   error: null,
   hasSurfaced: false,

   checkForUpdates: async () => {
      if (!isTauri()) return;
      const currentStatus = get().status;
      if (currentStatus === "checking" || currentStatus === "downloading") return;

      set({ status: "checking", error: null });
      try {
         const update = await check();
         if (update) {
            set({ status: "available", update, hasSurfaced: true });
         } else {
            set({ status: "up-to-date", update: null });
         }
      } catch (err) {
         set({ status: "error", error: err instanceof Error ? err.message : "Couldn't check for updates." });
      }
   },

   installUpdate: async () => {
      const { update } = get();
      if (!update) return;

      set({ status: "downloading", progress: 0, error: null });
      try {
         let contentLength = 0;
         let downloaded = 0;
         await update.downloadAndInstall((event) => {
            switch (event.event) {
               case "Started":
                  contentLength = event.data.contentLength ?? 0;
                  set({ progress: contentLength > 0 ? 0 : -1 });
                  break;
               case "Progress":
                  downloaded += event.data.chunkLength;
                  set({ progress: contentLength > 0 ? Math.min(100, Math.round((downloaded / contentLength) * 100)) : -1 });
                  break;
               case "Finished":
                  set({ progress: 100 });
                  break;
            }
         });
         set({ status: "ready" });
         await relaunch();
      } catch (err) {
         set({ status: "error", error: err instanceof Error ? err.message : "The update couldn't be installed." });
      }
   },

   dismiss: () => set({ status: "idle", update: null, progress: 0, error: null, hasSurfaced: false }),
}));
