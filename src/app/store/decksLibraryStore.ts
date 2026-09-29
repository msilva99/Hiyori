import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchDeckList, type DeckListQuery } from "../data/decksApi/client";
import { DecksApiError } from "../data/decksApi/types";
import type { RemoteDeckSummary } from "../data/decksApi/types";
import { useDecksStore } from "./decksStore";

type LibraryStatus = "idle" | "loading" | "ready" | "error";

type DecksLibraryStore = {
   // Last catalog we successfully fetched. Kept in storage so the Library screen
   // shows something instantly and still works offline.
   catalog: RemoteDeckSummary[];
   lastFetchedAt: string | null;
   // Remote deck ids the user has downloaded into their local decks.
   downloadedSourceIds: number[];
   // Reverse lookup (source id -> the local deck it created), so that when the
   // local deck is later deleted we know which downloadedSourceIds entry is now
   // stale. Only covers decks downloaded since this mapping was added - a deck
   // downloaded before then just won't be reconciled if deleted, which is fine.
   localDeckIdBySourceId: Record<number, string>;

   // Transient - not persisted.
   status: LibraryStatus;
   error: string | null;

   loadCatalog: (opts?: DeckListQuery) => Promise<void>;
   markDownloaded: (sourceId: number, localDeckId: string) => void;
   // Drops any downloaded-source entry whose local deck no longer exists.
   reconcileWithLocalDeckIds: (localDeckIds: string[]) => void;
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
         localDeckIdBySourceId: {},
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

         markDownloaded: (sourceId, localDeckId) => {
            set((state) => ({
               downloadedSourceIds: state.downloadedSourceIds.includes(sourceId)
                  ? state.downloadedSourceIds
                  : [...state.downloadedSourceIds, sourceId],
               localDeckIdBySourceId: { ...state.localDeckIdBySourceId, [sourceId]: localDeckId },
            }));
         },

         reconcileWithLocalDeckIds: (localDeckIds) => {
            const stillLocal = new Set(localDeckIds);
            const { downloadedSourceIds, localDeckIdBySourceId } = get();

            const staleSourceIds = downloadedSourceIds.filter((sourceId) => {
               const localDeckId = localDeckIdBySourceId[sourceId];
               return localDeckId !== undefined && !stillLocal.has(localDeckId);
            });
            if (staleSourceIds.length === 0) return;

            const staleSet = new Set(staleSourceIds);
            const nextMapping = { ...localDeckIdBySourceId };
            for (const sourceId of staleSourceIds) delete nextMapping[sourceId];

            set({
               downloadedSourceIds: downloadedSourceIds.filter((id) => !staleSet.has(id)),
               localDeckIdBySourceId: nextMapping,
            });
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
            localDeckIdBySourceId: state.localDeckIdBySourceId,
         }),
      }
   )
);

// Keeps "Downloaded" badges honest: whenever the local deck list changes (a
// deck added, edited, or - the case this exists for - deleted), drop any
// downloaded-source entry whose local deck is gone. Runs once at module load,
// for the lifetime of the app, so every deletion path is covered automatically
// rather than every UI call site having to remember to reconcile itself.
useDecksStore.subscribe((state, prevState) => {
   if (state.decks !== prevState.decks) {
      useDecksLibraryStore.getState().reconcileWithLocalDeckIds(state.decks.map((deck) => deck.id));
   }
});
