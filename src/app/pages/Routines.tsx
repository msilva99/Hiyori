import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
   Plus,
   Repeat,
   Star,
   Edit2,
   Trash2,
   Play,
   ChevronUp,
   ChevronDown,
   X,
   Layers,
   ClipboardCheck,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useDecksStore } from "../store/decksStore";
import { useRoutinesStore } from "../store/routinesStore";
import { startRoutineRun } from "../store/routineRunStore";
import { getStepSummary, type Routine, type RoutineStep, type RoutineStepInput } from "../data/routines";
import { Modal } from "../components/Modal";
import type { Deck } from "../data/types";

const WORD_COUNT_OPTIONS = [10, 20, 30, 50] as const;

function createLocalStepId() {
   return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createEmptyStudyStep(): RoutineStep {
   return { id: createLocalStepId(), type: "study", deckIds: [], wordLimit: "all" };
}

function createEmptyTestStep(): RoutineStep {
   return { id: createLocalStepId(), type: "test", deckIds: [] };
}

function stripStepId(step: RoutineStep): RoutineStepInput {
   return step.type === "study"
      ? { type: "study", deckIds: step.deckIds, wordLimit: step.wordLimit }
      : { type: "test", deckIds: step.deckIds };
}

export function Routines() {
   const decks = useDecksStore((state) => state.decks);
   const routines = useRoutinesStore((state) => state.routines);
   const activeRoutineId = useRoutinesStore((state) => state.activeRoutineId);
   const createRoutine = useRoutinesStore((state) => state.createRoutine);
   const updateRoutine = useRoutinesStore((state) => state.updateRoutine);
   const deleteRoutine = useRoutinesStore((state) => state.deleteRoutine);
   const addStep = useRoutinesStore((state) => state.addStep);
   const removeStep = useRoutinesStore((state) => state.removeStep);
   const setActiveRoutineId = useRoutinesStore((state) => state.setActiveRoutineId);
   const navigate = useNavigate();

   const [editingRoutine, setEditingRoutine] = useState<Routine | "new" | null>(null);
   const [deleteConfirm, setDeleteConfirm] = useState<Routine | null>(null);

   const studyableDecks = useMemo(() => decks.filter((deck) => deck.cards.length > 0), [decks]);

   const handleStart = (routine: Routine) => {
      startRoutineRun(routine, navigate);
   };

   const handleToggleActive = (routine: Routine) => {
      setActiveRoutineId(activeRoutineId === routine.id ? null : routine.id);
   };

   const handleSaveRoutine = (name: string, steps: RoutineStep[]) => {
      if (editingRoutine === "new") {
         const routine = createRoutine(name);
         steps.forEach((step) => addStep(routine.id, stripStepId(step)));
      } else if (editingRoutine) {
         updateRoutine(editingRoutine.id, { name });
         // Replace the whole step list rather than diffing - simpler and
         // correct, and step ids aren't referenced anywhere outside the store.
         editingRoutine.steps.forEach((step) => removeStep(editingRoutine.id, step.id));
         steps.forEach((step) => addStep(editingRoutine.id, stripStepId(step)));
      }

      setEditingRoutine(null);
   };

   const confirmDelete = () => {
      if (!deleteConfirm) {
         return;
      }

      deleteRoutine(deleteConfirm.id);
      setDeleteConfirm(null);
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
               <h1 className="text-4xl font-extrabold text-ink tracking-tight">Routines</h1>
               <p className="text-ink-muted mt-2 text-lg">Chain Study and Test steps into a repeatable session.</p>
            </div>
            <button
               onClick={() => setEditingRoutine("new")}
               className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand text-white font-medium hover:bg-brand-hover transition-all shadow-sm shadow-brand/20 shrink-0"
            >
               <Plus className="w-5 h-5" /> Create Routine
            </button>
         </motion.div>

         {routines.length === 0 ? (
            <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="bg-surface rounded-4xl p-10 border border-border-hiyori shadow-sm text-center"
            >
               <div className="w-20 h-20 bg-surface-hover rounded-full flex items-center justify-center text-ink-faint mx-auto mb-5">
                  <Repeat className="w-9 h-9" />
               </div>
               <h2 className="text-2xl font-bold text-ink">No routines yet</h2>
               <p className="text-ink-muted mt-3">Build a routine to chain Study and Test steps together.</p>
               <button
                  onClick={() => setEditingRoutine("new")}
                  className="inline-flex items-center gap-2 px-6 py-3 mt-8 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all shadow-sm shadow-brand/20"
               >
                  <Plus className="w-5 h-5" /> Create Routine
               </button>
            </motion.div>
         ) : (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.15 }}
               className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
               {routines.map((routine, i) => {
                  const isActive = activeRoutineId === routine.id;

                  return (
                     <motion.div
                        key={routine.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.05 }}
                        className={cn(
                           "bg-surface rounded-[28px] p-6 border shadow-sm flex flex-col gap-4",
                           isActive ? "border-brand" : "border-border-hiyori"
                        )}
                     >
                        <div className="flex items-start justify-between gap-3">
                           <div className="flex items-start gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                                 <Repeat className="w-6 h-6" />
                              </div>
                              <div className="min-w-0">
                                 <h3 className="font-bold text-xl text-ink leading-tight truncate">{routine.name}</h3>
                                 <p className="text-ink-muted text-sm">
                                    {routine.steps.length} step{routine.steps.length !== 1 ? "s" : ""}
                                 </p>
                              </div>
                           </div>
                           <button
                              onClick={() => handleToggleActive(routine)}
                              aria-pressed={isActive}
                              aria-label={isActive ? `Deactivate ${routine.name}` : `Mark ${routine.name} active`}
                              className={cn(
                                 "p-2 rounded-full transition-colors shrink-0",
                                 isActive ? "bg-brand text-white" : "text-ink-faint hover:text-ink hover:bg-page"
                              )}
                           >
                              <Star className={cn("w-5 h-5", isActive && "fill-current")} />
                           </button>
                        </div>

                        {routine.steps.length > 0 ? (
                           <div className="space-y-1.5">
                              {routine.steps.map((step, stepIndex) => (
                                 <div
                                    key={step.id}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-page border border-border-hiyori text-sm"
                                 >
                                    {step.type === "study" ? (
                                       <Layers className="w-4 h-4 text-brand shrink-0" />
                                    ) : (
                                       <ClipboardCheck className="w-4 h-4 text-brand shrink-0" />
                                    )}
                                    <span className="text-ink-muted truncate">
                                       {stepIndex + 1}. {getStepSummary(step, decks)}
                                    </span>
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <p className="text-ink-muted text-sm">No steps yet — edit this routine to add one.</p>
                        )}

                        <div className="flex items-center gap-2 pt-2 border-t border-border-hiyori mt-auto">
                           <button
                              onClick={() => setEditingRoutine(routine)}
                              aria-label={`Edit ${routine.name}`}
                              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-page text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors font-bold text-sm border border-border-hiyori shadow-sm"
                           >
                              <Edit2 className="w-4 h-4" />
                           </button>
                           <button
                              onClick={() => setDeleteConfirm(routine)}
                              aria-label={`Delete ${routine.name}`}
                              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-page text-destructive hover:bg-destructive-surface transition-colors font-bold text-sm border border-border-hiyori shadow-sm"
                           >
                              <Trash2 className="w-4 h-4" />
                           </button>
                           <button
                              onClick={() => handleStart(routine)}
                              disabled={routine.steps.length === 0}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand/10 text-brand hover:bg-brand/20 border border-brand/20 transition-colors font-bold text-sm shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                           >
                              <Play className="w-4 h-4 fill-current" /> Start
                           </button>
                        </div>
                     </motion.div>
                  );
               })}
            </motion.div>
         )}

         {editingRoutine &&
            createPortal(
               <RoutineEditorModal
                  routine={editingRoutine === "new" ? null : editingRoutine}
                  decks={studyableDecks}
                  onCancel={() => setEditingRoutine(null)}
                  onSave={handleSaveRoutine}
               />,
               document.body
            )}

         {deleteConfirm &&
            createPortal(
               <Modal onClose={() => setDeleteConfirm(null)} titleId="delete-routine-title" className="max-w-sm w-full p-8">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="w-10 h-10 rounded-2xl bg-destructive-surface flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-destructive" />
                     </div>
                     <h3 id="delete-routine-title" className="text-xl font-bold text-ink">Delete routine?</h3>
                  </div>
                  <div className="bg-page rounded-2xl border border-border-hiyori p-4 mb-6">
                     <p className="font-bold text-ink">{deleteConfirm.name}</p>
                     <p className="text-ink-muted text-sm mt-1">
                        {deleteConfirm.steps.length} step{deleteConfirm.steps.length !== 1 ? "s" : ""} will be removed. This cannot be undone.
                     </p>
                  </div>
                  <div className="flex gap-3">
                     <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 px-6 py-3 bg-surface-hover text-ink font-bold rounded-xl hover:bg-border-hiyori transition-colors cursor-pointer"
                     >
                        Cancel
                     </button>
                     <button
                        onClick={confirmDelete}
                        className="flex-1 px-6 py-3 bg-destructive text-white font-bold rounded-xl hover:bg-destructive-hover transition-colors cursor-pointer"
                     >
                        Delete
                     </button>
                  </div>
               </Modal>,
               document.body
            )}
      </div>
   );
}

type RoutineEditorModalProps = {
   routine: Routine | null;
   decks: Deck[];
   onCancel: () => void;
   onSave: (name: string, steps: RoutineStep[]) => void;
};

function RoutineEditorModal({ routine, decks, onCancel, onSave }: RoutineEditorModalProps) {
   const [name, setName] = useState(routine?.name ?? "");
   const [steps, setSteps] = useState<RoutineStep[]>(() => routine?.steps.map((step) => ({ ...step })) ?? []);

   const updateStepAt = (index: number, updates: Partial<RoutineStep>) => {
      setSteps((current) => current.map((step, i) => (i === index ? ({ ...step, ...updates } as RoutineStep) : step)));
   };

   const toggleStepDeck = (index: number, deckId: string) => {
      setSteps((current) =>
         current.map((step, i) => {
            if (i !== index) {
               return step;
            }

            const hasDeck = step.deckIds.includes(deckId);
            return {
               ...step,
               deckIds: hasDeck ? step.deckIds.filter((id) => id !== deckId) : [...step.deckIds, deckId],
            };
         })
      );
   };

   const removeStepAt = (index: number) => {
      setSteps((current) => current.filter((_, i) => i !== index));
   };

   const moveStep = (index: number, direction: -1 | 1) => {
      setSteps((current) => {
         const targetIndex = index + direction;
         if (targetIndex < 0 || targetIndex >= current.length) {
            return current;
         }

         const next = [...current];
         [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
         return next;
      });
   };

   const handleSave = () => {
      const trimmedName = name.trim();
      if (!trimmedName) {
         return;
      }

      onSave(trimmedName, steps);
   };

   return (
      <Modal onClose={onCancel} titleId="routine-editor-title" className="max-w-2xl w-full max-h-[85vh] flex flex-col">
         <div className="flex items-center justify-between gap-4 p-6 border-b border-border-hiyori shrink-0">
            <h3 id="routine-editor-title" className="text-xl font-bold text-ink">
               {routine ? "Edit Routine" : "Create Routine"}
            </h3>
            <button
               onClick={onCancel}
               aria-label="Close"
               className="p-2 rounded-full text-ink-faint hover:text-ink hover:bg-page transition-colors"
            >
               <X className="w-5 h-5" />
            </button>
         </div>

         <div className="p-6 space-y-6 overflow-y-auto">
            <div>
               <label className="text-sm font-bold text-ink-muted uppercase tracking-wider block mb-2">Name</label>
               <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Morning Drill"
                  className="w-full px-4 py-3 rounded-xl border border-border-hiyori bg-page text-ink focus:outline-none focus:ring-2 focus:ring-brand"
               />
            </div>

            <div className="space-y-4">
               <label className="text-sm font-bold text-ink-muted uppercase tracking-wider block">Steps</label>

               {steps.length === 0 && (
                  <p className="text-ink-muted text-sm">Add a Study or Test step below to get started.</p>
               )}

               {steps.map((step, index) => (
                  <div key={step.id} className="rounded-2xl border border-border-hiyori bg-page p-4 space-y-3">
                     <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold uppercase tracking-wider">
                           {step.type === "study" ? (
                              <Layers className="w-3.5 h-3.5" />
                           ) : (
                              <ClipboardCheck className="w-3.5 h-3.5" />
                           )}
                           Step {index + 1} · {step.type === "study" ? "Study" : "Test"}
                        </span>
                        <div className="flex items-center gap-1">
                           <button
                              type="button"
                              onClick={() => moveStep(index, -1)}
                              disabled={index === 0}
                              aria-label="Move step up"
                              className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                           >
                              <ChevronUp className="w-4 h-4" />
                           </button>
                           <button
                              type="button"
                              onClick={() => moveStep(index, 1)}
                              disabled={index === steps.length - 1}
                              aria-label="Move step down"
                              className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                           >
                              <ChevronDown className="w-4 h-4" />
                           </button>
                           <button
                              type="button"
                              onClick={() => removeStepAt(index)}
                              aria-label="Remove step"
                              className="p-1.5 rounded-lg text-destructive hover:bg-destructive-surface transition-colors"
                           >
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                     </div>

                     <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                        {decks.length === 0 ? (
                           <p className="text-ink-faint text-sm">No decks with words yet.</p>
                        ) : (
                           decks.map((deck) => {
                              const isSelected = step.deckIds.includes(deck.id);

                              return (
                                 <label
                                    key={deck.id}
                                    className={cn(
                                       "flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-all text-sm",
                                       isSelected
                                          ? "border-brand bg-brand-surface"
                                          : "border-border-hiyori bg-surface hover:bg-surface-hover"
                                    )}
                                 >
                                    <input
                                       type="checkbox"
                                       checked={isSelected}
                                       onChange={() => toggleStepDeck(index, deck.id)}
                                       className="w-4 h-4 rounded border-border-hiyori text-brand focus:ring-brand cursor-pointer shrink-0"
                                    />
                                    <span className="font-bold text-ink truncate">{deck.title}</span>
                                 </label>
                              );
                           })
                        )}
                     </div>

                     {step.type === "study" && (
                        <div className="flex flex-wrap gap-2">
                           {WORD_COUNT_OPTIONS.map((option) => (
                              <button
                                 key={option}
                                 type="button"
                                 onClick={() => updateStepAt(index, { wordLimit: option })}
                                 className={cn(
                                    "px-3.5 py-1.5 rounded-lg font-bold text-xs border transition-all",
                                    step.wordLimit === option
                                       ? "border-brand bg-brand text-white"
                                       : "border-border-hiyori bg-surface text-ink-muted hover:bg-surface-hover"
                                 )}
                              >
                                 {option}
                              </button>
                           ))}
                           <button
                              type="button"
                              onClick={() => updateStepAt(index, { wordLimit: "all" })}
                              className={cn(
                                 "px-3.5 py-1.5 rounded-lg font-bold text-xs border transition-all",
                                 step.wordLimit === "all"
                                    ? "border-brand bg-brand text-white"
                                    : "border-border-hiyori bg-surface text-ink-muted hover:bg-surface-hover"
                              )}
                           >
                              All due
                           </button>
                        </div>
                     )}
                  </div>
               ))}

               <div className="flex gap-2">
                  <button
                     type="button"
                     onClick={() => setSteps((current) => [...current, createEmptyStudyStep()])}
                     className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border-hiyori text-ink-muted hover:text-ink hover:bg-page transition-colors font-bold text-sm"
                  >
                     <Plus className="w-4 h-4" /> Add Study Step
                  </button>
                  <button
                     type="button"
                     onClick={() => setSteps((current) => [...current, createEmptyTestStep()])}
                     className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border-hiyori text-ink-muted hover:text-ink hover:bg-page transition-colors font-bold text-sm"
                  >
                     <Plus className="w-4 h-4" /> Add Test Step
                  </button>
               </div>
            </div>
         </div>

         <div className="flex gap-3 p-6 border-t border-border-hiyori shrink-0">
            <button
               onClick={onCancel}
               className="flex-1 px-6 py-3 bg-surface-hover text-ink font-bold rounded-xl hover:bg-border-hiyori transition-colors cursor-pointer"
            >
               Cancel
            </button>
            <button
               onClick={handleSave}
               disabled={!name.trim()}
               className="flex-1 px-6 py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
               Save Routine
            </button>
         </div>
      </Modal>
   );
}
