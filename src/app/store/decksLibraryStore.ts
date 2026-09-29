import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchDeckList, type DeckListQuery } from "../data/decksApi/client";
import { DecksApiError } from "../data/decksApi/types";
import type { RemoteDeckSummary } from "../data/decksApi/types";

type LibraryStatus = "idle" | "loading" | "ready" | "error";

type DecksLibraryStore = {
   // Last catalog we successfully fetched. Kept in storage so the Library screen
   // shows something instantly and still works offline.
   catalog: RemoteDeckSummary[];
   lastFetchedAt: string | null;
   // Remote deck ids the user has downloaded into their local decks.
   downloadedSourceIds: number[];

   // Transient - not persisted.
   status: LibraryStatus;
   error: string | null;

   loadCatalog: (opts?: DeckListQuery) => Promise<void>;
   markDownloaded: (id: number) => void;
};

function friendlyError(err: unknown): string {
   if (err instanceof DecksApiError) {
      if (err.kind === "parse") return "The library sent something we couldn't read. Try again shortly.";
      return "Couldn't reach the deck library. Check your connection and try again.";
   }
   return err instanceof Error ? err.message : "Something went wrong loading the library.";
}

export const useDecksLibraryStore = create<DecksLibraryStore>()(
   persist(
      (set, get) => ({
         catalog: [],
         lastFetchedAt: null,
         downloadedSourceIds: [],
         status: "idle",
         error: null,

         loadCatalog: async (opts) => {
            set({ status: "loading", error: null });
            try {
               const catalog = await fetchDeckList(opts);
               set({
                  catalog,
                  lastFetchedAt: new Date().toISOString(),
                  status: "ready",
                  error: null,
               });
            } catch (err) {
               // Keep whatever catalog we already had so the screen can fall back to it.
               set({ status: "error", error: friendlyError(err) });
            }
         },

         markDownloaded: (id) => {
            if (get().downloadedSourceIds.includes(id)) return;
            set((state) => ({ downloadedSourceIds: [...state.downloadedSourceIds, id] }));
         },
      }),
      {
         name: "hiyori-decks-library",
         version: 1,
         // Only the durable catalog cache round-trips; status/error are always
         // recomputed by the next loadCatalog.
         partialize: (state) => ({
            catalog: state.catalog,
            lastFetchedAt: state.lastFetchedAt,
            downloadedSourceIds: state.downloadedSourceIds,
         }),
      }
   )
);
