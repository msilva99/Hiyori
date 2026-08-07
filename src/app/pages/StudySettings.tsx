import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { BookOpen, Layers, Play } from "lucide-react";
import { cn } from "../../lib/utils";
import { useDecksStore } from "../store/decksStore";
import { isCardDue } from "../data/srs";

const WORD_COUNT_OPTIONS = [10, 20, 30, 50] as const;

export function StudySettings() {
   const decks = useDecksStore((state) => state.decks);
   const navigate = useNavigate();

   const studyableDecks = useMemo(() => decks.filter((deck) => deck.cards.length > 0), [decks]);

   const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(() => new Set(studyableDecks.map((deck) => deck.id)));
   const [wordLimit, setWordLimit] = useState<number | "all">("all");

   const toggleDeck = (deckId: string) => {
      setSelectedDeckIds((current) => {
         const next = new Set(current);
         if (next.has(deckId)) {
            next.delete(deckId);
         } else {
            next.add(deckId);
         }
         return next;
      });
   };

   const selectedDecks = studyableDecks.filter((deck) => selectedDeckIds.has(deck.id));
   const dueCardCount = selectedDecks.reduce(
      (total, deck) => total + deck.cards.filter((card) => isCardDue(card)).length,
      0
   );
   const totalCardCount = selectedDecks.reduce((total, deck) => total + deck.cards.length, 0);
   const plannedCount = wordLimit === "all" ? dueCardCount : Math.min(wordLimit, dueCardCount);

   const handleStart = () => {
      if (selectedDeckIds.size === 0) {
         return;
      }

      navigate("/study/session", {
         state: {
            deckIds: Array.from(selectedDeckIds),
            wordLimit,
         },
      });
   };

   return (
      <div className="space-y-8 font-sans max-w-3xl mx-auto w-full pb-20">
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-extrabold text-ink tracking-tight">Custom Study</h1>
            <p className="text-ink-muted mt-2 text-lg">Pick which decks to pull from and how many words for this session.</p>
         </motion.div>

         <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-surface border border-border-hiyori rounded-3xl shadow-sm p-6"
         >
            <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
               <Layers className="w-5 h-5 text-brand" /> Decks
            </h2>

            {studyableDecks.length === 0 ? (
               <p className="text-ink-muted">You don't have any decks with words yet. Add some words to a deck first.</p>
            ) : (
               <div className="space-y-2">
                  {studyableDecks.map((deck) => {
                     const dueCount = deck.cards.filter((card) => isCardDue(card)).length;
                     const isSelected = selectedDeckIds.has(deck.id);

                     return (
                        <label
                           key={deck.id}
                           className={cn(
                              "flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all",
                              isSelected ? "border-brand bg-brand-surface" : "border-border-hiyori bg-page hover:bg-surface-hover"
                           )}
                        >
                           <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleDeck(deck.id)}
                              className="w-5 h-5 rounded border-border-hiyori text-brand focus:ring-brand cursor-pointer shrink-0"
                           />
                           <div className="flex-1 min-w-0">
                              <p className="font-bold text-ink truncate">{deck.title}</p>
                              <p className="text-sm text-ink-muted">{deck.cards.length} cards</p>
                           </div>
                           <div className={cn(
                              "text-xs font-bold px-2.5 py-1 rounded-full shrink-0",
                              dueCount > 0 ? "bg-brand/10 text-brand" : "bg-success/10 text-success"
                           )}>
                              {dueCount > 0 ? `${dueCount} due` : "up to date"}
                           </div>
                        </label>
                     );
                  })}
               </div>
            )}
         </motion.div>

         <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface border border-border-hiyori rounded-3xl shadow-sm p-6"
         >
            <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
               <BookOpen className="w-5 h-5 text-brand" /> How many words?
            </h2>
            <div className="flex flex-wrap gap-2">
               {WORD_COUNT_OPTIONS.map((option) => (
                  <button
                     key={option}
                     type="button"
                     onClick={() => setWordLimit(option)}
                     className={cn(
                        "px-5 py-2.5 rounded-xl font-bold text-sm border transition-all",
                        wordLimit === option
                           ? "border-brand bg-brand text-white shadow-sm shadow-brand/20"
                           : "border-border-hiyori bg-page text-ink-muted hover:bg-surface-hover hover:text-ink"
                     )}
                  >
                     {option}
                  </button>
               ))}
               <button
                  type="button"
                  onClick={() => setWordLimit("all")}
                  className={cn(
                     "px-5 py-2.5 rounded-xl font-bold text-sm border transition-all",
                     wordLimit === "all"
                        ? "border-brand bg-brand text-white shadow-sm shadow-brand/20"
                        : "border-border-hiyori bg-page text-ink-muted hover:bg-surface-hover hover:text-ink"
                  )}
               >
                  All due
               </button>
            </div>
         </motion.div>

         <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-surface border border-border-hiyori rounded-3xl shadow-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
         >
            <div>
               <p className="text-ink-muted text-sm font-medium">
                  {selectedDecks.length === 0
                     ? "Select at least one deck to begin."
                     : dueCardCount === 0
                     ? `Nothing is due across ${selectedDecks.length} selected deck${selectedDecks.length !== 1 ? "s" : ""} (${totalCardCount} cards total). You'll get the option to practice anyway.`
                     : `This session will study ${plannedCount} of ${dueCardCount} due card${dueCardCount !== 1 ? "s" : ""}.`}
               </p>
            </div>
            <button
               onClick={handleStart}
               disabled={selectedDeckIds.size === 0}
               className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all shadow-sm shadow-brand/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
               <Play className="w-5 h-5 fill-current" /> Start Studying
            </button>
         </motion.div>
      </div>
   );
}
