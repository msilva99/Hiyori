import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
   ArrowLeft,
   Check,
   CheckCircle2,
   Eye,
   Languages,
   RotateCcw,
   X,
   XCircle,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useDecksStore } from "../store/decksStore";
import { useStudyLogStore } from "../store/studyLogStore";
import type { Card } from "../data/types";

type StudyStats = {
   correctAttempts: number;
   wrongAttempts: number;
   // A Set keeps each repeated card id only once, even if the learner misses it multiple times.
   retriedCardIds: Set<string>;
};

function shuffleCards(cards: Card[]) {
   const shuffledCards = [...cards];

   for (let i = shuffledCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
   }

   return shuffledCards;
}

function getCardPrompt(card: Card) {
   return card.kanji || card.kana || card.meaning;
}

function getCardFront(card: Card) {
   // Study cards deliberately ignore romaji: front is Japanese, back is meaning.
   return card.kanji || card.kana || "No prompt";
}

function createEmptyStats(): StudyStats {
   return {
      correctAttempts: 0,
      wrongAttempts: 0,
      retriedCardIds: new Set(),
   };
}

export function DeckStudy() {
   const { id } = useParams();
   const decks = useDecksStore((state) => state.decks);
   const recordDeckMasteryStep = useDecksStore((state) => state.recordDeckMasteryStep);
   const recordStudyLogEntry = useStudyLogStore((state) => state.recordStudyLogEntry);

   const deck = decks.find((item) => item.id === id);
   
   // This page stores only temporary session state. It does not write progress to saved deck data yet.
   const [queue, setQueue] = useState<Card[]>(() => shuffleCards(deck?.cards ?? []));
   const [completedCardIds, setCompletedCardIds] = useState<Set<string>>(() => new Set());
   const [isRevealed, setIsRevealed] = useState(false);
   const [isKanaVisible, setIsKanaVisible] = useState(false);
   const [isAlwaysKanaVisible, setIsAlwaysKanaVisible] = useState(false);
   const [hasRecordedMastery, setHasRecordedMastery] = useState(false);
   const [stats, setStats] = useState<StudyStats>(() => createEmptyStats());

   const currentCard = queue[0];
   const totalCards = deck?.cards.length ?? 0;
   const completedCount = completedCardIds.size;
   const progress = totalCards > 0 ? (completedCount / totalCards) * 100 : 0;
   const retriedCards = useMemo(() => {
      if (!deck) {
         return [];
      }

      // The completion screen needs full card objects, while stats only stores lightweight ids.
      return deck.cards.filter((card) => stats.retriedCardIds.has(card.id));
   }, [deck, stats.retriedCardIds]);

   if (!deck) {
      return (
         <div className="space-y-6 font-sans max-w-5xl mx-auto w-full">
            <Link to="/decks" className="inline-flex items-center gap-2 text-ink-muted hover:text-brand font-medium transition-colors text-sm">
               <ArrowLeft className="w-4 h-4" /> Back to Decks
            </Link>
            <div className="bg-surface rounded-4xl p-10 border border-border-hiyori shadow-sm text-center">
               <h1 className="text-3xl font-extrabold text-ink tracking-tight">Deck not found</h1>
               <p className="text-ink-muted mt-3">This deck may have been deleted or the link may be incorrect.</p>
            </div>
         </div>
      );
   }

   const startSession = () => {
      setQueue(shuffleCards(deck.cards));
      setCompletedCardIds(new Set());
      setIsRevealed(false);
      setIsKanaVisible(false);
      setHasRecordedMastery(false);
      setStats(createEmptyStats());
   };

   const handleGotIt = () => {
      if (!currentCard) {
         return;
      }

      if (queue.length === 1 && stats.wrongAttempts === 0 && !hasRecordedMastery) {
         recordDeckMasteryStep(deck.id);
         setHasRecordedMastery(true);
      }

      // Correct cards leave the queue permanently for this session.
      setStats((currentStats) => ({
         ...currentStats,
         correctAttempts: currentStats.correctAttempts + 1,
      }));
      recordStudyLogEntry({
         deckId: deck.id,
         cardsStudied: 1,
         correctAttempts: 1,
         wrongAttempts: 0,
      });
      setCompletedCardIds((currentIds) => new Set(currentIds).add(currentCard.id));
      setQueue((currentQueue) => currentQueue.slice(1));
      setIsRevealed(false);
      setIsKanaVisible(false);
   };

   const handleMissed = () => {
      if (!currentCard) {
         return;
      }

      // A missed card is counted as a wrong attempt, then saved for the completion summary.
      setStats((currentStats) => {
         const retriedCardIds = new Set(currentStats.retriedCardIds);
         retriedCardIds.add(currentCard.id);

         return {
            ...currentStats,
            wrongAttempts: currentStats.wrongAttempts + 1,
            retriedCardIds,
         };
      });
      recordStudyLogEntry({
         deckId: deck.id,
         cardsStudied: 0,
         correctAttempts: 0,
         wrongAttempts: 1,
      });
      // Missed cards move to the back of the queue, so the session only ends once every card is answered correctly.
      setQueue((currentQueue) => [...currentQueue.slice(1), currentCard]);
      setIsRevealed(false);
      setIsKanaVisible(false);
   };

   if (totalCards === 0) {
      return (
         <div className="space-y-6 font-sans max-w-3xl mx-auto w-full">
            <Link to={`/decks/${deck.id}`} className="inline-flex items-center gap-2 text-ink-muted hover:text-brand font-medium transition-colors text-sm">
               <ArrowLeft className="w-4 h-4" /> Back to Deck
            </Link>
            <div className="bg-surface rounded-4xl p-10 border border-border-hiyori shadow-sm text-center">
               <div className="w-20 h-20 bg-surface-hover rounded-full flex items-center justify-center text-ink-faint mx-auto mb-5">
                  <Eye className="w-9 h-9" />
               </div>
               <h1 className="text-3xl font-extrabold text-ink tracking-tight">No cards to study yet</h1>
               <p className="text-ink-muted mt-3">Add a few words to this deck, then start a practice session.</p>
               <Link to={`/decks/${deck.id}`} className="inline-flex items-center gap-2 px-6 py-3 mt-8 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all shadow-sm shadow-brand/20">
                  Add Words
               </Link>
            </div>
         </div>
      );
   }

   if (!currentCard) {
      const firstTryCorrect = totalCards - stats.retriedCardIds.size;

      return (
         <div className="flex flex-col items-center justify-center min-h-[62vh] max-w-3xl mx-auto w-full text-center space-y-7 font-sans">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 bg-brand/20 rounded-full flex items-center justify-center text-brand">
               <CheckCircle2 className="w-12 h-12" />
            </motion.div>

            <div>
               <p className="text-ink-muted font-bold text-sm uppercase tracking-wider mb-2">{deck.title}</p>
               <h1 className="text-4xl font-extrabold text-ink tracking-tight">Session complete</h1>
               <p className="text-ink-muted text-lg mt-3">You answered every card correctly before finishing.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
               <div className="bg-surface border border-border-hiyori rounded-2xl p-5 shadow-sm">
                  <div className="text-3xl font-black text-ink">{totalCards}</div>
                  <div className="text-xs font-bold text-ink-muted uppercase tracking-wider mt-1">Studied</div>
               </div>
               <div className="bg-surface border border-border-hiyori rounded-2xl p-5 shadow-sm">
                  <div className="text-3xl font-black text-success">{firstTryCorrect}</div>
                  <div className="text-xs font-bold text-ink-muted uppercase tracking-wider mt-1">First try</div>
               </div>
               <div className="bg-surface border border-border-hiyori rounded-2xl p-5 shadow-sm">
                  <div className="text-3xl font-black text-brand">{stats.wrongAttempts}</div>
                  <div className="text-xs font-bold text-ink-muted uppercase tracking-wider mt-1">Misses</div>
               </div>
            </div>

            {retriedCards.length > 0 && (
               <div className="w-full bg-surface border border-border-hiyori rounded-3xl p-6 text-left shadow-sm">
                  <h2 className="text-lg font-bold text-ink mb-4">Cards repeated</h2>
                  <div className="flex flex-wrap gap-2">
                     {retriedCards.map((card) => (
                        <span key={card.id} className="px-3 py-1.5 rounded-lg bg-surface-hover text-ink text-sm font-bold">
                           {getCardPrompt(card)}
                        </span>
                     ))}
                  </div>
               </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
               <Link to={`/decks/${deck.id}`} className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border-hiyori bg-surface text-ink font-bold hover:bg-page transition-all shadow-sm">
                  Back to Deck
               </Link>
               <button onClick={startSession} className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all shadow-sm shadow-brand/20">
                  <RotateCcw className="w-5 h-5" /> Study Again
               </button>
            </div>
         </div>
      );
   }

   const canToggleKana = Boolean(currentCard.kana && currentCard.kanji);
   const hasKanaToggleCards = deck.cards.some((card) => card.kana && card.kanji);
   const shouldShowKana = Boolean(canToggleKana && (isKanaVisible || isAlwaysKanaVisible));

   return (
      <div className="max-w-3xl mx-auto w-full pt-3 pb-10 font-sans">
         <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between gap-4">
               <Link to={`/decks/${deck.id}`} className="flex items-center gap-2 text-ink-muted hover:text-ink font-medium transition-colors text-sm">
                  <ArrowLeft className="w-4 h-4" /> Back to Deck
               </Link>
               <div className="flex items-center gap-3 text-sm font-bold text-ink-muted">
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-success" /> {stats.correctAttempts} correct</span>
                  <span className="inline-flex items-center gap-1.5"><X className="w-4 h-4 text-brand" /> {stats.wrongAttempts} missed</span>
               </div>
            </div>

            <div className="w-full bg-border-hiyori rounded-full h-1.5 overflow-hidden">
               <div className="bg-brand h-1.5 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
            </div>
         </div>

         <div className="flex items-center justify-between gap-3 mb-4">
            <div>
               <p className="text-ink-muted font-bold text-sm uppercase tracking-wider">{deck.title}</p>
               <h1 className="text-2xl font-extrabold text-ink tracking-tight mt-1">
                  {stats.retriedCardIds.has(currentCard.id) ? "Retry card" : "Study card"}
               </h1>
            </div>
            <div className="text-right">
               <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Progress</p>
               <p className="text-lg font-black text-ink">{completedCount} / {totalCards}</p>
            </div>
         </div>

         <motion.div
            layout
            className={cn(
               "bg-surface rounded-4xl p-7 md:p-9 border shadow-sm min-h-82.5 flex flex-col",
               stats.retriedCardIds.has(currentCard.id) ? "border-brand/30" : "border-border-hiyori"
            )}
         >
            <AnimatePresence mode="wait">
               <motion.div
                  key={`${currentCard.id}-${isRevealed ? "back" : "front"}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col items-center justify-center text-center min-h-62.5"
               >
                  {isRevealed ? (
                     <div className="flex flex-col items-center text-center max-w-full">
                        {(currentCard.kanji || currentCard.kana) && (
                           <div className="mb-6">

                              {currentCard.kana && (
                                 <div className="text-lg md:text-xl text-ink-muted mt-2 font-medium wrap-break-word">
                                    {currentCard.kana}
                                 </div>
                              )}
                              
                              {currentCard.kanji && (
                                 <div className="text-3xl md:text-4xl font-bold text-ink leading-tight wrap-break-word">
                                    {currentCard.kanji}
                                 </div>
                              )}

                           </div>
                        )}

                        <div className="text-5xl md:text-6xl font-black text-ink leading-tight wrap-break-word">
                           {currentCard.meaning || "No meaning set"}
                        </div>
                     </div>
                     // <div className="text-5xl md:text-6xl font-black text-ink leading-tight break-words max-w-full">
                     //    {currentCard.meaning || "No meaning set"}
                     // </div>
                  ) : (
                     <>
                        {/* Kana is optional help on the front. Flipping the card shows only the meaning. */}
                        {shouldShowKana && (
                           <div className="text-3xl md:text-4xl font-black text-ink-muted leading-tight wrap-break-word max-w-full mb-3">
                              {currentCard.kana}
                           </div>
                        )}
                        <div className="text-6xl md:text-7xl font-black text-ink leading-tight wrap-break-word max-w-full">
                           {getCardFront(currentCard)}
                        </div>
                     </>
                  )}
               </motion.div>
            </AnimatePresence>
         </motion.div>

         <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            {isRevealed ? (
               <>
                  <button onClick={handleMissed} className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-red-100 bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-all shadow-sm">
                     <XCircle className="w-5 h-5" /> Missed
                  </button>
                  <button onClick={handleGotIt} className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-success text-white font-bold hover:bg-success-hover transition-all shadow-sm shadow-success/20">
                     <Check className="w-5 h-5" /> Got it
                  </button>
               </>
            ) : (
               <>
                  <button
                     onClick={() => setIsKanaVisible((currentValue) => !currentValue)}
                     disabled={!canToggleKana || isAlwaysKanaVisible}
                     className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-border-hiyori bg-surface text-ink font-bold hover:bg-page transition-all shadow-sm disabled:text-ink-faint disabled:bg-surface-hover disabled:cursor-not-allowed"
                  >
                     {isKanaVisible ? "Hide Kana" : "Show Kana"}
                  </button>
                  <button onClick={() => setIsRevealed(true)} className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all shadow-sm shadow-brand/20">
                     <Eye className="w-5 h-5" /> Flip Card
                  </button>
               </>
            )}
         </div>

         <div className="mt-4 flex justify-center">
            <button
               type="button"
               aria-pressed={isAlwaysKanaVisible}
               disabled={!hasKanaToggleCards}
               onClick={() => {
                  setIsAlwaysKanaVisible((currentValue) => !currentValue);
                  setIsKanaVisible(false);
               }}
               className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:border-border-hiyori disabled:bg-surface-hover disabled:text-ink-faint",
                  isAlwaysKanaVisible
                     ? "border-brand bg-brand-surface text-brand"
                     : "border-border-hiyori bg-surface text-ink-muted hover:bg-page hover:text-ink"
               )}
            >
               <Languages className="w-4 h-4" />
               Always show kana
            </button>
         </div>
      </div>
   );
}
