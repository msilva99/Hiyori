import { useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
   Plus, 
   Download, 
   Search, 
   MoreVertical, 
   Play, 
   BookOpen, 
   Book,
   Edit2,
   Trash2
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { cn } from "../../lib/utils";
import { useDecksStore } from "../store/decksStore";
import type { Card } from "../data/types";

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

function getDeckMastery(deck: { masteryPerfectSessions: number }) {
   return Math.min(deck.masteryPerfectSessions, 5) * 20;
}

type ImportableCard = Pick<Card, "kanji" | "kana" | "romaji" | "meaning">;

function getFallbackDeckTitle(fileName: string) {
   return fileName.replace(/\.[^/.]+$/, "").trim() || "Imported Deck";
}

function toStringField(value: unknown) {
   return typeof value === "string" ? value.trim() : "";
}

function parseImportableCard(value: unknown): ImportableCard | null {
   if (!value || typeof value !== "object") {
      return null;
   }

   const card = value as Record<string, unknown>;
   const importableCard = {
      kanji: toStringField(card.kanji),
      kana: toStringField(card.kana),
      romaji: toStringField(card.romaji),
      meaning: toStringField(card.meaning),
   };

   // A completely empty row is ignored so imports can tolerate accidental blanks.
   if (!importableCard.kanji && !importableCard.kana && !importableCard.romaji && !importableCard.meaning) {
      return null;
   }

   return importableCard;
}

function parseDeckImport(jsonText: string, fileName: string) {
   const parsedJson = JSON.parse(jsonText) as unknown;
   const fallbackTitle = getFallbackDeckTitle(fileName);

   // Preferred shape:
   // { "title": "JLPT N5", "cards": [{ "kanji": "食べる", "kana": "たべる", "romaji": "taberu", "meaning": "to eat" }] }
   if (parsedJson && typeof parsedJson === "object" && !Array.isArray(parsedJson)) {
      const importedDeck = parsedJson as Record<string, unknown>;
      const title = toStringField(importedDeck.title) || fallbackTitle;
      const cards = Array.isArray(importedDeck.cards) ? importedDeck.cards.map(parseImportableCard).filter(Boolean) : [];

      return { title, cards: cards as ImportableCard[] };
   }

   // Convenience shape for quick personal imports:
   // [{ "kanji": "食べる", "kana": "たべる", "romaji": "taberu", "meaning": "to eat" }]
   if (Array.isArray(parsedJson)) {
      const cards = parsedJson.map(parseImportableCard).filter(Boolean);
      return { title: fallbackTitle, cards: cards as ImportableCard[] };
   }

   return { title: fallbackTitle, cards: [] };
}

export function Decks() {
   // This page only needs deck data, so it reads and writes decks through the zustand store directly.
   const decks = useDecksStore((state) => state.decks);
   const createDeck = useDecksStore((state) => state.createDeck);
   const deleteDeck = useDecksStore((state) => state.deleteDeck);
   const importDeck = useDecksStore((state) => state.importDeck);
   const navigate = useNavigate();
   
   const importInputRef = useRef<HTMLInputElement>(null);
   const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
   
   const [searchQuery, setSearchQuery] = useState("");
   const [sortBy, setSortBy] = useState<"lastStudied" | "alphabetical" | "inProgress">("lastStudied");

   const normalizedSearchQuery = searchQuery.trim().toLowerCase();

   // Search query + sort
   const filteredDecks = useMemo(() => {

      const filtered = decks.filter((deck) => {
      return deck.title
         .toLowerCase()
         .includes(normalizedSearchQuery);
      });

      const sorted = [...filtered];

      switch (sortBy) {

         case "alphabetical":
            sorted.sort((a, b) =>
               a.title.localeCompare(b.title)
            );
            break;

         case "inProgress":
            sorted.sort(
               (a, b) =>
                  getDeckMastery(a) -
                  getDeckMastery(b)
            );
            break;

         case "lastStudied":
         default:
            sorted.sort((a, b) => {

               // fallback until study logs exist
               return (
                  new Date(b.updatedAt).getTime() -
                  new Date(a.updatedAt).getTime()
               );
            });

            break;
      }

      return sorted;

   }, [
         decks,
         normalizedSearchQuery,
         sortBy,
      ]
   );

   // Delete Deck
                        
   const handleDelete = (id: string) => {
      // Browser confirm is acceptable for this prototype; replace with a custom dialog later.
      if (confirm("Are you sure you want to delete this deck? This action cannot be undone.")) {
         deleteDeck(id);
         setActiveMenuId(null);
      }
   };

   // Create New Deck

   const handleCreateDeck = () => {
      // Manual deck creation starts with an empty deck, then the detail screen handles renaming and adding words.
      const deck = createDeck("Untitled Deck");
      navigate(`/decks/${deck.id}`);
   };

   // Import Deck

   const handleImportClick = () => {
      importInputRef.current?.click();
   };

   const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) {
         return;
      }

      try {
         const importedDeck = parseDeckImport(await file.text(), file.name);

         if (importedDeck.cards.length === 0) {
            alert("This file did not contain any valid cards to import.");
            return;
         }

         const deck = importDeck(importedDeck.title, importedDeck.cards);
         navigate(`/decks/${deck.id}`);
      } catch {
         alert("This deck could not be imported. Please choose a valid JSON file.");
      }
   };

   return (
      <div className="space-y-10 font-sans max-w-5xl mx-auto w-full pb-20">
         {/* Header */}
         <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-6"
         >
            <div>
               <h1 className="text-4xl font-extrabold text-ink tracking-tight">Your Decks</h1>
               <p className="text-ink-muted mt-2 text-lg">Manage your vocabulary and study sets.</p>
            </div>
            
            <div className="flex items-center gap-3">
               <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleImportFile}
               />
               <button onClick={handleImportClick} className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border-hiyori bg-surface text-ink font-medium hover:bg-page transition-all shadow-sm">
                  <Download className="w-5 h-5" /> Import
               </button>
               <button onClick={handleCreateDeck} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand text-white font-medium hover:bg-brand-hover transition-all shadow-sm shadow-brand/20">
                  <Plus className="w-5 h-5" /> Create Deck
               </button>
            </div>
         </motion.div>

         {/* Toolbar / Search */}
         <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface p-2 rounded-2xl border border-border-hiyori shadow-sm flex items-center gap-2 relative z-20"
         >
            <div className="flex-1 relative">
               <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
               <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search decks..." 
                  className="w-full pl-12 pr-4 py-3 bg-transparent text-ink placeholder:text-ink-faint focus:outline-none rounded-xl"
               />
            </div>
            <div className="w-px h-8 bg-border-hiyori hidden md:block" />
            <div className="hidden md:flex items-center gap-2 px-4 text-ink-muted">
               <span className="text-sm font-medium">Sort by:</span>
               <select
                  value={sortBy}
                  onChange={(e) =>
                     setSortBy(e.target.value as typeof sortBy)
                  }
                  className="bg-transparent font-bold text-ink focus:outline-none cursor-pointer"
               >
                  <option value="lastStudied">Last Studied</option>
                  <option value="alphabetical">Alphabetical</option>
                  <option value="inProgress">In Progress</option>
               </select>
            </div>
         </motion.div>

         {/* Decks Grid */}
         <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10"
         >
            {filteredDecks.map((deck, i) => {
               // Due cards are placeholders until spaced repetition is implemented.
               const totalCards = deck.cards.length;
               const dueCards = 0;
               const progress = getDeckMastery(deck);
               const color = getDeckColor(i);

               return (
                  <motion.div 
                     key={deck.id}
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 0.2 + i * 0.05 }}
                     className="bg-surface rounded-[28px] p-6 border border-border-hiyori shadow-sm hover:shadow-md transition-all group flex flex-col relative overflow-visible min-w-[280px]"
                  >
                     {/* Top Right Menu */}
                     <div className="absolute top-6 right-4">
                        <button 
                           onClick={() => setActiveMenuId(activeMenuId === deck.id ? null : deck.id)}
                           className={cn(
                              "p-2 rounded-full transition-colors",
                              activeMenuId === deck.id 
                                 ? "bg-surface-hover text-ink" 
                                 : "text-ink-faint hover:text-ink hover:bg-page"
                           )}
                        >
                           <MoreVertical className="w-5 h-5" />
                        </button>
                        
                        <AnimatePresence>
                           {activeMenuId === deck.id && (
                              <>
                                 <div className="fixed inset-0 z-30" onClick={() => setActiveMenuId(null)} />
                                 <motion.div 
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border-hiyori shadow-xl rounded-2xl p-1 z-40"
                                 >
                                    <Link 
                                       to={`/decks/${deck.id}`} 
                                       className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-ink hover:bg-page rounded-xl transition-colors"
                                    >
                                       <Edit2 className="w-4 h-4 text-ink-muted" /> Edit Deck Info
                                    </Link>
                                    <button 
                                       onClick={() => handleDelete(deck.id)}
                                       className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                    >
                                       <Trash2 className="w-4 h-4 text-red-500" /> Delete Deck
                                    </button>
                                 </motion.div>
                              </>
                           )}
                        </AnimatePresence>
                     </div>

                     <div className="flex items-start gap-4 mb-6">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", color, "bg-opacity-20")}>
                           <Book className={cn("w-7 h-7", color.replace("bg-", "text-"))} />
                        </div>
                        <div className="pt-1">
                           <h3 className="font-bold text-xl text-ink leading-tight mb-1 group-hover:text-brand transition-colors pr-12 line-clamp-2">{deck.title}</h3>
                           <span className="text-ink-muted text-sm bg-surface-hover px-2 py-0.5 rounded-md font-medium">
                              {totalCards} cards
                           </span>
                        </div>
                     </div>
                     
                     <div className="flex-1 flex flex-col justify-end">
                        <div className="flex justify-between items-end mb-4">
                            <div className="flex justify-between items-center w-full gap-3">
                               <span className="text-sm text-ink-muted font-medium whitespace-nowrap block mb-1">Mastery: {progress}%</span>
                               <div className="flex-1 bg-surface-hover rounded-full h-1.5 overflow-hidden">
                                 <div 
                                    className="bg-success h-1.5 rounded-full transition-all duration-1000 ease-out" 
                                    style={{ width: `${progress}%` }}
                                 />
                              </div>
                           </div>
                        </div>
                        
                        {/* Subtle Action Buttons instead of the big CTA */}
                        <div className="flex items-center gap-2 pt-4 border-t border-border-hiyori">
                           <Link 
                              to={`/decks/${deck.id}`} 
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-page text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors font-bold text-sm border border-border-hiyori shadow-sm"
                           >
                              <BookOpen className="w-4 h-4" /> Details
                           </Link>
                           {totalCards === 0 ? (
                              <span className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm bg-surface-hover text-ink-faint border border-border-hiyori">
                                 <Play className="w-4 h-4 fill-current" /> Study
                              </span>
                           ) : (
                              <Link
                                 to={`/decks/${deck.id}/study`}
                                 className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm",
                                    dueCards > 0 
                                       ? "bg-brand/10 text-brand hover:bg-brand/20 border border-brand/20" 
                                       : "bg-success/10 text-success hover:bg-success/20 border border-success/20"
                                 )}
                              >
                                 <Play className="w-4 h-4 fill-current" /> Study
                              </Link>
                           )}
                        </div>
                     </div>
                  </motion.div>
               );
            })}
         </motion.div>
      </div>
   );
}
