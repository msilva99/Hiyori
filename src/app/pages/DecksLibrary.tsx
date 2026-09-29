import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Link } from "react-router";
import {
   ArrowLeft,
   Book,
   Check,
   CheckCircle,
   Download,
   Loader2,
   RefreshCw,
   Search,
   AlertTriangle,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useDecksLibraryStore } from "../store/decksLibraryStore";
import { useDecksStore } from "../store/decksStore";
import { fetchDeckDetail } from "../data/decksApi/client";
import { DecksApiError, type RemoteDeckSummary } from "../data/decksApi/types";

const deckColorClasses = [
   "bg-deck-pine",
   "bg-deck-sand",
   "bg-deck-sky",
   "bg-deck-rose",
   "bg-deck-cream",
   "bg-deck-mist",
];

function getDeckColor(index: number) {
   return deckColorClasses[index % deckColorClasses.length];
}

type Toast = { kind: "success" | "error"; text: string };

export function DecksLibrary() {
   const catalog = useDecksLibraryStore((state) => state.catalog);
   const status = useDecksLibraryStore((state) => state.status);
   const error = useDecksLibraryStore((state) => state.error);
   const lastFetchedAt = useDecksLibraryStore((state) => state.lastFetchedAt);
   const downloadedSourceIds = useDecksLibraryStore((state) => state.downloadedSourceIds);
   const loadCatalog = useDecksLibraryStore((state) => state.loadCatalog);
   const markDownloaded = useDecksLibraryStore((state) => state.markDownloaded);

   const importDeck = useDecksStore((state) => state.importDeck);

   const [searchQuery, setSearchQuery] = useState("");
   const [selectedCategories, setSelectedCategories] = useState<Set<string>>(() => new Set());
   const [downloadingId, setDownloadingId] = useState<number | null>(null);
   const [toast, setToast] = useState<Toast | null>(null);
   const toastTimer = useRef<number | undefined>(undefined);

   // The API does the filtering, so re-fetch (debounced) whenever the query or the
   // selected categories change. This also drives the initial load on mount.
   useEffect(() => {
      const categories = [...selectedCategories];
      const handle = window.setTimeout(() => {
         loadCatalog({ q: searchQuery, categories });
      }, 300);
      return () => window.clearTimeout(handle);
   }, [searchQuery, selectedCategories, loadCatalog]);

   useEffect(() => () => window.clearTimeout(toastTimer.current), []);

   const showToast = (next: Toast) => {
      setToast(next);
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 3000);
   };

   // Chips come from the categories present in the current catalog, plus any that
   // are selected (a narrow filter can hide the deck that contributed a chip).
   const allCategories = useMemo(() => {
      const seen = new Set<string>(selectedCategories);
      for (const deck of catalog) {
         for (const category of deck.categories) seen.add(category);
      }
      return [...seen].sort((a, b) => a.localeCompare(b));
   }, [catalog, selectedCategories]);

   const toggleCategory = (category: string) => {
      setSelectedCategories((current) => {
         const next = new Set(current);
         if (next.has(category)) {
            next.delete(category);
         } else {
            next.add(category);
         }
         return next;
      });
   };

   const retry = () => {
      loadCatalog({ q: searchQuery, categories: [...selectedCategories] });
   };

   const handleDownload = async (deck: RemoteDeckSummary) => {
      setDownloadingId(deck.id);
      try {
         const detail = await fetchDeckDetail(deck.id);
         // Copy only Hiyori's four card fields - importDeck spreads the card after
         // assigning a fresh local id, so the API's numeric id must not ride along.
         importDeck(
            detail.title,
            detail.cards.map((card) => ({
               kanji: card.kanji,
               kana: card.kana,
               romaji: card.romaji,
               meaning: card.meaning,
            }))
         );
         markDownloaded(deck.id);
         showToast({ kind: "success", text: `"${detail.title}" added to Your Decks` });
      } catch (err) {
         const text =
            err instanceof DecksApiError && err.kind === "not_found"
               ? "That deck isn't in the library anymore."
               : "Couldn't download that deck. Please try again.";
         showToast({ kind: "error", text });
      } finally {
         setDownloadingId(null);
      }
   };

   const isInitialLoading = status === "loading" && catalog.length === 0;
   const isEmptyAfterError = status === "error" && catalog.length === 0;
   const isStale = status === "error" && catalog.length > 0;
   const isEmptyResult = status === "ready" && catalog.length === 0;

   return (
      <div className="space-y-8 font-sans max-w-5xl mx-auto w-full pb-20">
         {/* Header */}
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Link
               to="/decks"
               className="inline-flex items-center gap-2 text-ink-muted hover:text-brand font-medium transition-colors mb-6 text-sm"
            >
               <ArrowLeft className="w-4 h-4" /> Back to Decks
            </Link>
            <h1 className="text-4xl font-extrabold text-ink tracking-tight">Deck Library</h1>
            <p className="text-ink-muted mt-2 text-lg">Browse and download ready-made study decks.</p>
         </motion.div>

         {/* Toolbar */}
         <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-surface p-4 rounded-2xl border border-border-hiyori shadow-sm space-y-4"
         >
            <div className="relative">
               <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
               <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search decks and words..."
                  className="w-full pl-12 pr-4 py-3 bg-page border border-border-hiyori text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand rounded-xl transition-colors"
               />
            </div>

            {allCategories.length > 0 && (
               <div className="flex flex-wrap gap-2">
                  {allCategories.map((category) => {
                     const active = selectedCategories.has(category);
                     return (
                        <button
                           key={category}
                           type="button"
                           onClick={() => toggleCategory(category)}
                           className={cn(
                              "px-3 py-1.5 rounded-full text-sm font-bold border transition-all",
                              active
                                 ? "border-brand bg-brand text-white shadow-sm shadow-brand/20"
                                 : "border-border-hiyori bg-page text-ink-muted hover:bg-surface-hover hover:text-ink"
                           )}
                        >
                           {category}
                        </button>
                     );
                  })}
               </div>
            )}
         </motion.div>

         {/* Stale banner */}
         {isStale && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-brand-surface border border-brand/30 rounded-2xl px-5 py-4">
               <div className="flex items-center gap-3 text-ink">
                  <AlertTriangle className="w-5 h-5 text-brand shrink-0" />
                  <div>
                     <p className="font-bold text-sm">Showing your last saved list</p>
                     <p className="text-ink-muted text-sm">
                        Couldn't reach the library
                        {lastFetchedAt
                           ? ` — last updated ${new Date(lastFetchedAt).toLocaleDateString()}`
                           : ""}
                        .
                     </p>
                  </div>
               </div>
               <button
                  onClick={retry}
                  className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border-hiyori text-ink font-bold text-sm hover:bg-surface-hover transition-colors"
               >
                  <RefreshCw className="w-4 h-4" /> Retry
               </button>
            </div>
         )}

         {/* Content */}
         {isInitialLoading ? (
            <div className="flex justify-center py-20">
               <div className="w-8 h-8 border-4 border-border-hiyori border-t-brand rounded-full animate-spin" />
            </div>
         ) : isEmptyAfterError ? (
            <div className="bg-surface rounded-3xl p-10 border border-border-hiyori shadow-sm text-center">
               <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-ink-faint" />
               </div>
               <h2 className="text-2xl font-extrabold text-ink tracking-tight">Can't reach the library</h2>
               <p className="text-ink-muted mt-2">{error ?? "Check your connection and try again."}</p>
               <button
                  onClick={retry}
                  className="inline-flex items-center gap-2 px-6 py-3 mt-6 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all shadow-sm shadow-brand/20"
               >
                  <RefreshCw className="w-5 h-5" /> Try again
               </button>
            </div>
         ) : isEmptyResult ? (
            <div className="bg-surface rounded-3xl p-10 border border-border-hiyori shadow-sm text-center">
               <p className="text-ink-muted font-medium text-lg">No decks match your search.</p>
            </div>
         ) : (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6"
            >
               {catalog.map((deck, index) => {
                  const color = getDeckColor(index);
                  const downloaded = downloadedSourceIds.includes(deck.id);
                  const downloading = downloadingId === deck.id;

                  return (
                     <motion.div
                        key={deck.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.04, 0.3) }}
                        className="bg-surface rounded-[28px] p-6 border border-border-hiyori shadow-sm hover:shadow-md transition-all flex flex-col min-w-0"
                     >
                        <div className="flex items-start gap-4 mb-4">
                           <div
                              className={cn(
                                 "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
                                 color,
                                 "bg-opacity-20"
                              )}
                           >
                              <Book className={cn("w-7 h-7", color.replace("bg-", "text-"))} />
                           </div>
                           <div className="pt-1 min-w-0">
                              <h3 className="font-bold text-xl text-ink leading-tight mb-1 line-clamp-2">
                                 {deck.title}
                              </h3>
                              <span className="text-ink-muted text-sm bg-surface-hover px-2 py-0.5 rounded-md font-medium">
                                 {deck.card_count} card{deck.card_count !== 1 ? "s" : ""}
                              </span>
                           </div>
                        </div>

                        {deck.description && (
                           <p className="text-ink-muted text-sm mb-4 line-clamp-2">{deck.description}</p>
                        )}

                        {deck.categories.length > 0 && (
                           <div className="flex flex-wrap gap-1.5 mb-5">
                              {deck.categories.slice(0, 4).map((category) => (
                                 <span
                                    key={category}
                                    className="text-[11px] font-bold uppercase tracking-wider text-ink-muted bg-page border border-border-hiyori px-2 py-0.5 rounded-md"
                                 >
                                    {category}
                                 </span>
                              ))}
                              {deck.categories.length > 4 && (
                                 <span className="text-[11px] font-bold text-ink-faint px-1 py-0.5">
                                    +{deck.categories.length - 4}
                                 </span>
                              )}
                           </div>
                        )}

                        <div className="flex-1 flex flex-col justify-end pt-4 border-t border-border-hiyori">
                           {downloaded ? (
                              <span className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm bg-success/10 text-success border border-success/20">
                                 <Check className="w-4 h-4" /> Downloaded
                              </span>
                           ) : (
                              <button
                                 onClick={() => handleDownload(deck)}
                                 disabled={downloading}
                                 className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm bg-brand text-white hover:bg-brand-hover transition-colors shadow-sm shadow-brand/20 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                 {downloading ? (
                                    <>
                                       <Loader2 className="w-4 h-4 animate-spin" /> Adding…
                                    </>
                                 ) : (
                                    <>
                                       <Download className="w-4 h-4" /> Download
                                    </>
                                 )}
                              </button>
                           )}
                        </div>
                     </motion.div>
                  );
               })}
            </motion.div>
         )}

         {/* Toast */}
         {toast &&
            createPortal(
               <div
                  className={cn(
                     "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 text-white rounded-2xl shadow-lg max-w-sm",
                     toast.kind === "success"
                        ? "bg-success border border-success-hover"
                        : "bg-destructive border border-destructive-hover"
                  )}
               >
                  {toast.kind === "success" ? (
                     <CheckCircle className="w-5 h-5 shrink-0" />
                  ) : (
                     <AlertTriangle className="w-5 h-5 shrink-0" />
                  )}
                  <span className="font-bold text-sm">{toast.text}</span>
               </div>,
               document.body
            )}
      </div>
   );
}
