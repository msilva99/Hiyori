import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
   ArrowLeft,
   ArrowRight,
   Check,
   CheckCircle2,
   Eye,
   Languages,
   Repeat,
   RotateCcw,
   Sparkles,
   X,
   XCircle,
   Zap,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useDecksStore } from "../store/decksStore";
import { useStudyLogStore } from "../store/studyLogStore";
import { useRoutineRunStore, continueToNextStep } from "../store/routineRunStore";
import {
   collectSessionCards,
   collectDueSessionCards,
   getCardFront,
   shuffleCards,
   useTransitionLock,
   type SessionCard,
} from "../data/studySession";

type StudyStats = {
   correctAttempts: number;
   wrongAttempts: number;
   retriedCardIds: Set<string>;
};

function createEmptyStats(): StudyStats {
   return { correctAttempts: 0, wrongAttempts: 0, retriedCardIds: new Set() };
}

type SessionState = {
   deckIds: string[];
   wordLimit: number | "all";
   routineToken?: string;
   routineStepIndex?: number;
};

function applyLimit(cards: SessionCard[], wordLimit: number | "all") {
   const shuffled = shuffleCards(cards);
   return wordLimit === "all" ? shuffled : shuffled.slice(0, wordLimit);
}

function RoutineStepBanner({ routineName, currentStepIndex, totalSteps }: { routineName: string; currentStepIndex: number; totalSteps: number }) {
   return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 text-brand text-sm font-bold">
         <Repeat className="w-4 h-4" /> {routineName} — Step {currentStepIndex + 1} of {totalSteps}
      </div>
   );
}

function RoutineStepActions({ isLastRoutineStep, onContinue, onExit }: { isLastRoutineStep: boolean; onContinue: () => void; onExit: () => void }) {
   return (
      <>
         <button onClick={onExit} className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border-hiyori bg-surface text-ink font-bold hover:bg-page transition-all shadow-sm">
            Exit Routine
         </button>
         <button onClick={onContinue} className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all shadow-sm shadow-brand/20">
            {isLastRoutineStep ? "Finish Routine" : "Continue to Next Step"} <ArrowRight className="w-5 h-5" />
         </button>
      </>
   );
}

export function StudySession() {
   const location = useLocation();
   const navigate = useNavigate();
   const decks = useDecksStore((state) => state.decks);
   const recordDeckMasteryStep = useDecksStore((state) => state.recordDeckMasteryStep);
   const recordCardReview = useDecksStore((state) => state.recordCardReview);
   const recordStudyLogEntry = useStudyLogStore((state) => state.recordStudyLogEntry);

   const sessionState = location.state as SessionState | null;
   const deckIds = useMemo(() => sessionState?.deckIds ?? [], [sessionState]);
   const wordLimit = sessionState?.wordLimit ?? "all";

   const run = useRoutineRunStore((state) => state.run);
   const isRoutineStep = Boolean(
      run && sessionState?.routineToken === run.token && sessionState?.routineStepIndex === run.currentStepIndex
   );
   const isLastRoutineStep = isRoutineStep && run!.currentStepIndex === run!.steps.length - 1;
   const endRoutineRun = useRoutineRunStore((state) => state.endRun);

   const handleRoutineContinue = () => {
      if (isLastRoutineStep) {
         endRoutineRun();
         navigate("/routines");
      } else {
         continueToNextStep(navigate);
      }
   };

   const handleRoutineExit = () => {
      endRoutineRun();
      navigate("/study");
   };

   const selectedDecks = useMemo(() => decks.filter((deck) => deckIds.includes(deck.id)), [decks, deckIds]);
   const deckTitleById = useMemo(() => new Map(selectedDecks.map((deck) => [deck.id, deck.title])), [selectedDecks]);

   const [dueCardsAtMount] = useState<SessionCard[]>(() =>
      applyLimit(collectDueSessionCards(decks, deckIds), wordLimit)
   );

   const [queue, setQueue] = useState<SessionCard[]>(() => dueCardsAtMount);
   const [sessionCardCount, setSessionCardCount] = useState(() => dueCardsAtMount.length);
   const [sessionDeckIds, setSessionDeckIds] = useState<Set<string>>(() => new Set(dueCardsAtMount.map((card) => card.deckId)));
   const [isPracticeMode, setIsPracticeMode] = useState(false);
   const [completedCardIds, setCompletedCardIds] = useState<Set<string>>(() => new Set());
   const [isRevealed, setIsRevealed] = useState(false);
   const [isKanaVisible, setIsKanaVisible] = useState(false);
   const [isAlwaysKanaVisible, setIsAlwaysKanaVisible] = useState(false);
   const [hasRecordedMastery, setHasRecordedMastery] = useState(false);
   const [stats, setStats] = useState<StudyStats>(() => createEmptyStats());

   const withTransitionLock = useTransitionLock();

   const currentCard = queue[0];
   const totalCards = selectedDecks.reduce((total, deck) => total + deck.cards.length, 0);
   const completedCount = completedCardIds.size;
   const progress = sessionCardCount > 0 ? (completedCount / sessionCardCount) * 100 : 0;
   const isAllCaughtUp = totalCards > 0 && dueCardsAtMount.length === 0 && !isPracticeMode;
   const retriedCards = useMemo(() => {
      const allCards = collectSessionCards(decks, deckIds);
      return allCards.filter((card) => stats.retriedCardIds.has(card.id));
   }, [decks, deckIds, stats.retriedCardIds]);

   const startSession = () => {
      const allCards = applyLimit(collectSessionCards(decks, deckIds), wordLimit);
      setQueue(allCards);
      setSessionCardCount(allCards.length);
      setSessionDeckIds(new Set(allCards.map((card) => card.deckId)));
      setCompletedCardIds(new Set());
      setIsRevealed(false);
      setIsKanaVisible(false);
      setHasRecordedMastery(false);
      setStats(createEmptyStats());
   };

   const practiceAnyway = () => {
      startSession();
      setIsPracticeMode(true);
   };

   const handleGrade = useCallback((grade: "again" | "good" | "easy") => {
      if (!currentCard) {
         return;
      }

      withTransitionLock(() => {
         recordCardReview(currentCard.deckId, currentCard.id, grade);

         if (grade === "again") {
            setStats((currentStats) => {
               const retriedCardIds = new Set(currentStats.retriedCardIds);
               retriedCardIds.add(currentCard.id);
               return { ...currentStats, wrongAttempts: currentStats.wrongAttempts + 1, retriedCardIds };
            });
            recordStudyLogEntry({ deckId: currentCard.deckId, cardsStudied: 0, correctAttempts: 0, wrongAttempts: 1 });
            // Missed cards move to the back of the queue, so the session only ends once every card is answered correctly.
            setQueue((currentQueue) => [...currentQueue.slice(1), currentCard]);
         } else {
            if (queue.length === 1 && stats.wrongAttempts === 0 && !hasRecordedMastery) {
               sessionDeckIds.forEach((deckId) => recordDeckMasteryStep(deckId));
               setHasRecordedMastery(true);
            }

            setStats((currentStats) => ({ ...currentStats, correctAttempts: currentStats.correctAttempts + 1 }));
            recordStudyLogEntry({ deckId: currentCard.deckId, cardsStudied: 1, correctAttempts: 1, wrongAttempts: 0 });
            setCompletedCardIds((currentIds) => new Set(currentIds).add(currentCard.id));
            setQueue((currentQueue) => currentQueue.slice(1));
         }

         setIsRevealed(false);
         setIsKanaVisible(false);
      });
   }, [currentCard, queue.length, stats.wrongAttempts, hasRecordedMastery, sessionDeckIds, recordDeckMasteryStep, recordCardReview, recordStudyLogEntry, withTransitionLock]);

   const handleReveal = useCallback(() => {
      withTransitionLock(() => setIsRevealed(true));
   }, [withTransitionLock]);

   useEffect(() => {
      if (!currentCard) {
         return;
      }

      const handleKeyDown = (event: KeyboardEvent) => {
         if (event.metaKey || event.ctrlKey || event.altKey) {
            return;
         }

         if (!isRevealed) {
            if (event.key === " " || event.key === "Enter") {
               event.preventDefault();
               handleReveal();
            } else if (
               event.key.toLowerCase() === "k" &&
               currentCard.kana &&
               currentCard.kanji &&
               !isAlwaysKanaVisible
            ) {
               event.preventDefault();
               setIsKanaVisible((currentValue) => !currentValue);
            }
         } else {
            if (event.key === "1" || event.key === "ArrowLeft") {
               event.preventDefault();
               handleGrade("again");
            } else if (event.key === "2" || event.key === "ArrowRight" || event.key === " " || event.key === "Enter") {
               event.preventDefault();
               handleGrade("good");
            } else if (event.key === "3") {
               event.preventDefault();
               handleGrade("easy");
            }
         }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
   }, [currentCard, isRevealed, isAlwaysKanaVisible, handleGrade, handleReveal]);

   if (!sessionState || deckIds.length === 0) {
      return (
         <div className="space-y-6 font-sans max-w-3xl mx-auto w-full">
            <div className="bg-surface rounded-4xl p-10 border border-border-hiyori shadow-sm text-center">
               <h1 className="text-3xl font-extrabold text-ink tracking-tight">No study session set up</h1>
               <p className="text-ink-muted mt-3">Choose your decks and word count first.</p>
               <Link to="/study" className="inline-flex items-center gap-2 px-6 py-3 mt-8 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all shadow-sm shadow-brand/20">
                  Go to Custom Study
               </Link>
            </div>
         </div>
      );
   }

   if (totalCards === 0) {
      return (
         <div className="space-y-6 font-sans max-w-3xl mx-auto w-full">
            {isRoutineStep ? (
               <RoutineStepBanner routineName={run!.routineName} currentStepIndex={run!.currentStepIndex} totalSteps={run!.steps.length} />
            ) : (
               <Link to="/study" className="inline-flex items-center gap-2 text-ink-muted hover:text-brand font-medium transition-colors text-sm">
                  <ArrowLeft className="w-4 h-4" /> Back to Custom Study
               </Link>
            )}
            <div className="bg-surface rounded-4xl p-10 border border-border-hiyori shadow-sm text-center">
               <div className="w-20 h-20 bg-surface-hover rounded-full flex items-center justify-center text-ink-faint mx-auto mb-5">
                  <Eye className="w-9 h-9" />
               </div>
               <h1 className="text-3xl font-extrabold text-ink tracking-tight">No cards to study</h1>
               <p className="text-ink-muted mt-3">The selected decks don't have any words yet.</p>
               {isRoutineStep && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-8">
                     <RoutineStepActions isLastRoutineStep={isLastRoutineStep} onContinue={handleRoutineContinue} onExit={handleRoutineExit} />
                  </div>
               )}
            </div>
         </div>
      );
   }

   const sessionTitle = selectedDecks.length === 1 ? selectedDecks[0].title : `${selectedDecks.length} decks`;

   if (!currentCard && isAllCaughtUp) {
      return (
         <div className="flex flex-col items-center justify-center min-h-[62vh] max-w-3xl mx-auto w-full text-center space-y-7 font-sans">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 bg-success/20 rounded-full flex items-center justify-center text-success">
               <Sparkles className="w-12 h-12" />
            </motion.div>

            <div>
               {isRoutineStep && (
                  <div className="mb-4 flex justify-center">
                     <RoutineStepBanner routineName={run!.routineName} currentStepIndex={run!.currentStepIndex} totalSteps={run!.steps.length} />
                  </div>
               )}
               <p className="text-ink-muted font-bold text-sm uppercase tracking-wider mb-2">{sessionTitle}</p>
               <h1 className="text-4xl font-extrabold text-ink tracking-tight">All caught up!</h1>
               <p className="text-ink-muted text-lg mt-3">Nothing is due for review right now. Come back later, or practice anyway.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
               {isRoutineStep ? (
                  <RoutineStepActions isLastRoutineStep={isLastRoutineStep} onContinue={handleRoutineContinue} onExit={handleRoutineExit} />
               ) : (
                  <Link to="/study" className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border-hiyori bg-surface text-ink font-bold hover:bg-page transition-all shadow-sm">
                     Back to Custom Study
                  </Link>
               )}
               <button onClick={practiceAnyway} className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all shadow-sm shadow-brand/20">
                  <RotateCcw className="w-5 h-5" /> Practice Anyway
               </button>
            </div>
         </div>
      );
   }

   if (!currentCard) {
      const firstTryCorrect = sessionCardCount - stats.retriedCardIds.size;

      return (
         <div className="flex flex-col items-center justify-center min-h-[62vh] max-w-3xl mx-auto w-full text-center space-y-7 font-sans">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 bg-brand/20 rounded-full flex items-center justify-center text-brand">
               <CheckCircle2 className="w-12 h-12" />
            </motion.div>

            <div>
               {isRoutineStep && (
                  <div className="mb-4 flex justify-center">
                     <RoutineStepBanner routineName={run!.routineName} currentStepIndex={run!.currentStepIndex} totalSteps={run!.steps.length} />
                  </div>
               )}
               <p className="text-ink-muted font-bold text-sm uppercase tracking-wider mb-2">{sessionTitle}</p>
               <h1 className="text-4xl font-extrabold text-ink tracking-tight">Session complete</h1>
               <p className="text-ink-muted text-lg mt-3">You answered every card correctly before finishing.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
               <div className="bg-surface border border-border-hiyori rounded-2xl p-5 shadow-sm">
                  <div className="text-3xl font-black text-ink">{sessionCardCount}</div>
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
                           {card.kanji || card.kana}
                        </span>
                     ))}
                  </div>
               </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
               {isRoutineStep ? (
                  <RoutineStepActions isLastRoutineStep={isLastRoutineStep} onContinue={handleRoutineContinue} onExit={handleRoutineExit} />
               ) : (
                  <Link to="/study" className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border-hiyori bg-surface text-ink font-bold hover:bg-page transition-all shadow-sm">
                     Back to Custom Study
                  </Link>
               )}
               <button onClick={startSession} className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all shadow-sm shadow-brand/20">
                  <RotateCcw className="w-5 h-5" /> Study Again
               </button>
            </div>
         </div>
      );
   }

   const canToggleKana = Boolean(currentCard.kana && currentCard.kanji);
   const shouldShowKana = Boolean(canToggleKana && (isKanaVisible || isAlwaysKanaVisible));

   return (
      <div className="max-w-3xl mx-auto w-full pt-3 pb-10 font-sans">
         <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between gap-4">
               <button onClick={() => navigate("/study")} className="flex items-center gap-2 text-ink-muted hover:text-ink font-medium transition-colors text-sm cursor-pointer">
                  <ArrowLeft className="w-4 h-4" /> Back to Custom Study
               </button>
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
               <p className="text-ink-muted font-bold text-sm uppercase tracking-wider">{sessionTitle}</p>
               <h1 className="text-2xl font-extrabold text-ink tracking-tight mt-1">
                  {stats.retriedCardIds.has(currentCard.id) ? "Retry card" : "Study card"}
               </h1>
            </div>
            <div className="text-right">
               <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Progress</p>
               <p className="text-lg font-black text-ink">{completedCount} / {sessionCardCount}</p>
            </div>
         </div>

         <div role="status" aria-live="polite" className="sr-only">
            {isRevealed ? `Answer: ${currentCard.meaning || "No meaning set"}` : `Card: ${getCardFront(currentCard)}`}
         </div>

         <div className="relative">
            {selectedDecks.length > 1 && (
               <span className="absolute top-5 right-6 z-10 text-xs font-bold text-ink-faint bg-surface-hover px-2.5 py-1 rounded-full">
                  {deckTitleById.get(currentCard.deckId)}
               </span>
            )}
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
                  ) : (
                     <>
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
         </div>

         <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            {isRevealed ? (
               <>
                  <button onClick={() => handleGrade("again")} className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-destructive-surface-border bg-destructive-surface text-destructive-hover font-bold hover:bg-destructive-surface-hover transition-all shadow-sm">
                     <XCircle className="w-5 h-5" /> Again
                     <kbd className="hidden sm:inline-flex items-center justify-center min-w-5 h-5 px-1 rounded bg-destructive-hover/10 text-[11px] font-bold">1</kbd>
                  </button>
                  <button onClick={() => handleGrade("good")} className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-success text-white font-bold hover:bg-success-hover transition-all shadow-sm shadow-success/20">
                     <Check className="w-5 h-5" /> Good
                     <kbd className="hidden sm:inline-flex items-center justify-center min-w-5 h-5 px-1 rounded bg-white/20 text-[11px] font-bold">2</kbd>
                  </button>
                  <button onClick={() => handleGrade("easy")} className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all shadow-sm shadow-brand/20">
                     <Zap className="w-5 h-5" /> Easy
                     <kbd className="hidden sm:inline-flex items-center justify-center min-w-5 h-5 px-1 rounded bg-white/20 text-[11px] font-bold">3</kbd>
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
                     {canToggleKana && !isAlwaysKanaVisible && (
                        <kbd className="hidden sm:inline-flex items-center justify-center min-w-5 h-5 px-1 rounded bg-ink/10 text-[11px] font-bold text-ink-muted">K</kbd>
                     )}
                  </button>
                  <button onClick={handleReveal} className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all shadow-sm shadow-brand/20">
                     <Eye className="w-5 h-5" /> Flip Card
                     <kbd className="hidden sm:inline-flex items-center justify-center min-w-5 h-5 px-1 rounded bg-white/20 text-[11px] font-bold">Space</kbd>
                  </button>
               </>
            )}
         </div>

         <div className="mt-4 flex justify-center">
            <button
               type="button"
               aria-pressed={isAlwaysKanaVisible}
               disabled={!canToggleKana}
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
