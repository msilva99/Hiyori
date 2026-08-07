import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
   ArrowRight,
   Check,
   CircleDashed,
   Clock3,
   Eye,
   Flag,
   Frown,
   Languages,
   Layers,
   Meh,
   Repeat,
   RotateCcw,
   Smile,
   Sparkles,
   Trash2,
   XCircle,
   Zap,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useDecksStore } from "../store/decksStore";
import { useRoutineRunStore, continueToNextStep } from "../store/routineRunStore";
import { useTestSessionStore, type TestCardRef, type TestGrade } from "../store/testSessionStore";
import {
   collectSessionCards,
   formatEstimatedDuration,
   getCardFront,
   resolveSessionCard,
   shuffleCards,
   useTransitionLock,
   type SessionCard,
} from "../data/studySession";
import { Modal } from "../components/Modal";
import type { Deck } from "../data/types";

type GradedCard = { card: SessionCard; grade: TestGrade };

type RoutineTestState = {
   deckIds?: string[];
   routineToken?: string;
   routineStepIndex?: number;
};

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

const GRADE_INFO: Record<TestGrade, { label: string; description: string }> = {
   easy: { label: "Know well", description: "Answered easily" },
   good: { label: "Know okay", description: "Got it, but had to think" },
   again: { label: "Don't know", description: "Missed or guessed" },
};

function buildCardOrder(decks: Deck[], deckIds: string[]): TestCardRef[] {
   return shuffleCards(collectSessionCards(decks, deckIds)).map((card) => ({ cardId: card.id, deckId: card.deckId }));
}

export function Test() {
   const decks = useDecksStore((state) => state.decks);
   const testableDecks = useMemo(() => decks.filter((deck) => deck.cards.length > 0), [decks]);

   const location = useLocation();
   const navigate = useNavigate();
   const routineState = location.state as RoutineTestState | null;

   const session = useTestSessionStore((state) => state.session);
   const startSessionAction = useTestSessionStore((state) => state.startSession);
   const gradeCurrentCard = useTestSessionStore((state) => state.gradeCurrentCard);
   const skipCurrentCard = useTestSessionStore((state) => state.skipCurrentCard);
   const endEarlyAction = useTestSessionStore((state) => state.endEarly);
   const clearSessionAction = useTestSessionStore((state) => state.clearSession);

   const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(() => new Set());
   const [isRevealed, setIsRevealed] = useState(false);
   const [isKanaVisible, setIsKanaVisible] = useState(false);
   const [isAlwaysKanaVisible, setIsAlwaysKanaVisible] = useState(false);
   const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

   const run = useRoutineRunStore((state) => state.run);
   const endRoutineRun = useRoutineRunStore((state) => state.endRun);
   const isRoutineStep = Boolean(
      run && routineState?.routineToken === run.token && routineState?.routineStepIndex === run.currentStepIndex
   );
   const isLastRoutineStep = isRoutineStep && run!.currentStepIndex === run!.steps.length - 1;

   const startNewSession = useCallback(
      (deckIds: string[]) => {
         const cardOrder = buildCardOrder(decks, deckIds);
         if (cardOrder.length === 0) {
            return;
         }
         startSessionAction(deckIds, cardOrder);
      },
      [decks, startSessionAction]
   );

   // A routine's Test step arrives with preset deckIds in location.state - start
   // (and so implicitly replace any abandoned prior session) once, on mount.
   useEffect(() => {
      if (routineState?.deckIds?.length) {
         startNewSession(routineState.deckIds);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

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

   const totalWords = testableDecks
      .filter((deck) => selectedDeckIds.has(deck.id))
      .reduce((total, deck) => total + deck.cards.length, 0);

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
      clearSessionAction();
      navigate("/test", { replace: true });
   };

   const cardOrder = session?.cardOrder ?? [];
   const currentIndex = session?.currentIndex ?? 0;
   const isResultsPhase = Boolean(session) && currentIndex >= cardOrder.length;
   const isTestingPhase = Boolean(session) && !isResultsPhase;

   const currentCardRef = cardOrder[currentIndex];
   const currentCard = currentCardRef ? resolveSessionCard(decks, currentCardRef) : null;
   const withTransitionLock = useTransitionLock();

   // The underlying card or its deck was deleted since the test started - skip
   // past it rather than crashing or showing a blank card.
   useEffect(() => {
      if (isTestingPhase && currentCardRef && !currentCard) {
         skipCurrentCard();
      }
   }, [isTestingPhase, currentCardRef, currentCard, skipCurrentCard]);

   const handleGrade = useCallback((grade: TestGrade) => {
      if (!currentCard) {
         return;
      }

      withTransitionLock(() => {
         gradeCurrentCard(grade);
         setIsRevealed(false);
         setIsKanaVisible(false);
      });
   }, [currentCard, gradeCurrentCard, withTransitionLock]);

   const handleReveal = useCallback(() => {
      withTransitionLock(() => setIsRevealed(true));
   }, [withTransitionLock]);

   useEffect(() => {
      if (!isTestingPhase || !currentCard) {
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
               setIsKanaVisible((value) => !value);
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
   }, [isTestingPhase, currentCard, isRevealed, isAlwaysKanaVisible, handleGrade, handleReveal]);

   if (!session) {
      return (
         <div className="space-y-8 font-sans max-w-3xl mx-auto w-full pb-20">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
               <h1 className="text-4xl font-extrabold text-ink tracking-tight">Test Yourself</h1>
               <p className="text-ink-muted mt-2 text-lg">
                  Choose which decks to be tested on. Every word is shown once, no repeats -
                  this is a check-in, not a study session, so it won't change your review schedule.
               </p>
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

               {testableDecks.length === 0 ? (
                  <p className="text-ink-muted">You don't have any decks with words yet.</p>
               ) : (
                  <div className="space-y-2">
                     {testableDecks.map((deck) => {
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
               className="bg-surface border border-border-hiyori rounded-3xl shadow-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
            >
               <div className="flex items-center gap-6">
                  <div>
                     <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Total words</p>
                     <p className="text-2xl font-black text-ink">{totalWords}</p>
                  </div>
                  <div>
                     <p className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" /> Est. time</p>
                     <p className="text-2xl font-black text-ink">{totalWords > 0 ? formatEstimatedDuration(totalWords) : "-"}</p>
                  </div>
               </div>
               <button
                  onClick={() => startNewSession(Array.from(selectedDeckIds))}
                  disabled={totalWords === 0}
                  className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all shadow-sm shadow-brand/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
               >
                  Start Test {totalWords > 0 && `(${totalWords} words)`}
               </button>
            </motion.div>
         </div>
      );
   }

   if (isResultsPhase) {
      const buckets: Record<TestGrade, GradedCard[]> = { easy: [], good: [], again: [] };
      session.results.forEach((result) => {
         const card = resolveSessionCard(decks, result);
         if (card) {
            buckets[result.grade].push({ card, grade: result.grade });
         }
      });

      // Cards that were in the original selection but never got graded - either
      // because "End Early" skipped them, or the card/deck was deleted mid-test.
      const testedCardIds = new Set(session.results.map((result) => result.cardId));
      const untestedCards = session.cardOrder
         .filter((ref) => !testedCardIds.has(ref.cardId))
         .map((ref) => resolveSessionCard(decks, ref))
         .filter((card): card is SessionCard => Boolean(card));

      return (
         <div className="space-y-8 font-sans max-w-3xl mx-auto w-full pb-20">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 mx-auto bg-brand/20 rounded-full flex items-center justify-center text-brand">
               <Sparkles className="w-10 h-10" />
            </motion.div>

            <div className="text-center">
               {isRoutineStep && (
                  <div className="mb-4 flex justify-center">
                     <RoutineStepBanner routineName={run!.routineName} currentStepIndex={run!.currentStepIndex} totalSteps={run!.steps.length} />
                  </div>
               )}
               <h1 className="text-4xl font-extrabold text-ink tracking-tight">Test complete</h1>
               <p className="text-ink-muted mt-3 text-lg">
                  {untestedCards.length > 0
                     ? `You answered ${session.results.length} of ${session.cardOrder.length} words.`
                     : `You were tested on ${session.results.length} word${session.results.length !== 1 ? "s" : ""}.`}
               </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
               <div className="bg-surface border border-border-hiyori rounded-2xl p-5 shadow-sm text-center">
                  <div className="text-3xl font-black text-success">{buckets.easy.length}</div>
                  <div className="text-xs font-bold text-ink-muted uppercase tracking-wider mt-1">Know well</div>
               </div>
               <div className="bg-surface border border-border-hiyori rounded-2xl p-5 shadow-sm text-center">
                  <div className="text-3xl font-black text-brand">{buckets.good.length}</div>
                  <div className="text-xs font-bold text-ink-muted uppercase tracking-wider mt-1">Know okay</div>
               </div>
               <div className="bg-surface border border-border-hiyori rounded-2xl p-5 shadow-sm text-center">
                  <div className="text-3xl font-black text-destructive">{buckets.again.length}</div>
                  <div className="text-xs font-bold text-ink-muted uppercase tracking-wider mt-1">Don't know</div>
               </div>
            </div>

            {(["again", "good", "easy"] as TestGrade[]).map((grade) => (
               buckets[grade].length > 0 && (
                  <div key={grade} className="bg-surface border border-border-hiyori rounded-3xl p-6 shadow-sm">
                     <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
                        {grade === "easy" && <Smile className="w-5 h-5 text-success" />}
                        {grade === "good" && <Meh className="w-5 h-5 text-brand" />}
                        {grade === "again" && <Frown className="w-5 h-5 text-destructive" />}
                        {GRADE_INFO[grade].label} ({buckets[grade].length})
                     </h2>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {buckets[grade].map(({ card }) => (
                           <div key={card.id} className="flex items-center justify-between gap-3 px-4 py-2.5 bg-page rounded-xl border border-border-hiyori">
                              <span className="font-bold text-ink">{card.kanji || card.kana}</span>
                              <span className="text-ink-muted text-sm text-right truncate">{card.meaning}</span>
                           </div>
                        ))}
                     </div>
                  </div>
               )
            ))}

            {untestedCards.length > 0 && (
               <div className="bg-surface border border-border-hiyori rounded-3xl p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
                     <CircleDashed className="w-5 h-5 text-ink-faint" /> Not tested ({untestedCards.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                     {untestedCards.map((card) => (
                        <div key={card.id} className="flex items-center justify-between gap-3 px-4 py-2.5 bg-page rounded-xl border border-border-hiyori">
                           <span className="font-bold text-ink">{card.kanji || card.kana}</span>
                           <span className="text-ink-muted text-sm text-right truncate">{card.meaning}</span>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
               {isRoutineStep ? (
                  <RoutineStepActions isLastRoutineStep={isLastRoutineStep} onContinue={handleRoutineContinue} onExit={handleRoutineExit} />
               ) : (
                  <button
                     onClick={() => clearSessionAction()}
                     className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border-hiyori bg-surface text-ink font-bold hover:bg-page transition-all shadow-sm"
                  >
                     New Test
                  </button>
               )}
               <button
                  onClick={() => startNewSession(session.deckIds)}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all shadow-sm shadow-brand/20"
               >
                  <RotateCcw className="w-5 h-5" /> Test Again
               </button>
            </div>
         </div>
      );
   }

   // isTestingPhase
   if (!currentCard) {
      return null;
   }

   const canToggleKana = Boolean(currentCard.kana && currentCard.kanji);
   const shouldShowKana = Boolean(canToggleKana && (isKanaVisible || isAlwaysKanaVisible));
   const progress = cardOrder.length > 0 ? (currentIndex / cardOrder.length) * 100 : 0;

   return (
      <div className="max-w-3xl mx-auto w-full pt-3 pb-10 font-sans">
         <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between gap-4">
               {isRoutineStep ? (
                  <RoutineStepBanner routineName={run!.routineName} currentStepIndex={run!.currentStepIndex} totalSteps={run!.steps.length} />
               ) : (
                  <p className="text-ink-muted font-bold text-sm uppercase tracking-wider">Testing</p>
               )}
               <p className="text-sm font-bold text-ink-muted">{currentIndex + 1} / {cardOrder.length}</p>
            </div>
            <div className="w-full bg-border-hiyori rounded-full h-1.5 overflow-hidden">
               <div className="bg-brand h-1.5 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
            </div>
         </div>

         <div role="status" aria-live="polite" className="sr-only">
            {isRevealed ? `Answer: ${currentCard.meaning || "No meaning set"}` : `Card: ${getCardFront(currentCard)}`}
         </div>

         <motion.div
            layout
            className="bg-surface rounded-4xl p-7 md:p-9 border border-border-hiyori shadow-sm min-h-82.5 flex flex-col"
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
                     onClick={() => setIsKanaVisible((value) => !value)}
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
                  setIsAlwaysKanaVisible((value) => !value);
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

         <div className="mt-8 pt-6 border-t border-border-hiyori text-center space-y-3">
            <p className="text-xs text-ink-muted">
               Your progress saves automatically — it's safe to leave this page or close the tab anytime.
            </p>
            <div className="flex items-center justify-center gap-3">
               <button
                  onClick={() => endEarlyAction()}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border-hiyori bg-surface text-ink-muted hover:text-ink hover:bg-page font-bold text-sm transition-all"
               >
                  <Flag className="w-4 h-4" /> End Early
               </button>
               <button
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border-hiyori bg-surface text-ink-muted hover:text-destructive-hover hover:bg-destructive-surface font-bold text-sm transition-all"
               >
                  <Trash2 className="w-4 h-4" /> Reset Test
               </button>
            </div>
         </div>

         {isResetConfirmOpen &&
            createPortal(
               <Modal onClose={() => setIsResetConfirmOpen(false)} titleId="reset-test-title" className="max-w-sm w-full p-8">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="w-10 h-10 rounded-2xl bg-destructive-surface flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-destructive" />
                     </div>
                     <h3 id="reset-test-title" className="text-xl font-bold text-ink">Reset this test?</h3>
                  </div>
                  <p className="text-ink-muted text-sm mb-6">
                     You've answered {currentIndex} of {cardOrder.length}. This can't be undone — you'll start over
                     with a fresh deck selection.
                  </p>
                  <div className="flex gap-3">
                     <button
                        onClick={() => setIsResetConfirmOpen(false)}
                        className="flex-1 px-6 py-3 bg-surface-hover text-ink font-bold rounded-xl hover:bg-border-hiyori transition-colors cursor-pointer"
                     >
                        Cancel
                     </button>
                     <button
                        onClick={() => {
                           clearSessionAction();
                           setIsResetConfirmOpen(false);
                        }}
                        className="flex-1 px-6 py-3 bg-destructive text-white font-bold rounded-xl hover:bg-destructive-hover transition-colors cursor-pointer"
                     >
                        Reset Test
                     </button>
                  </div>
               </Modal>,
               document.body
            )}
      </div>
   );
}
