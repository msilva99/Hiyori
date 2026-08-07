import { create } from "zustand";
import type { NavigateFunction } from "react-router";
import type { Routine, RoutineStep } from "../data/routines";
import { buildStepLocationState, getStepRoutePath } from "../data/routines";

function createToken() {
   return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type RoutineRunState = {
   token: string;
   routineId: string;
   // Snapshot of name/steps at run start, so a rename or edit mid-run can't
   // relabel or reshuffle a run that's already in progress.
   routineName: string;
   steps: RoutineStep[];
   currentStepIndex: number;
};

type RoutineRunStore = {
   run: RoutineRunState | null;
   startRun: (routine: Routine) => RoutineRunState;
   advanceToNextStep: () => void;
   endRun: () => void;
};

// Deliberately not persisted: routing is client-side and Layout never remounts,
// so an in-memory store already survives navigation between /study/session and
// /test. Persisting it would let a stale run survive a full reload and leak
// "inside a routine" state into an unrelated standalone session.
export const useRoutineRunStore = create<RoutineRunStore>((set) => ({
   run: null,

   startRun: (routine) => {
      const run: RoutineRunState = {
         token: createToken(),
         routineId: routine.id,
         routineName: routine.name,
         steps: routine.steps,
         currentStepIndex: 0,
      };

      set({ run });
      return run;
   },

   advanceToNextStep: () => {
      set((state) =>
         state.run ? { run: { ...state.run, currentStepIndex: state.run.currentStepIndex + 1 } } : state
      );
   },

   endRun: () => set({ run: null }),
}));

export function startRoutineRun(routine: Routine, navigate: NavigateFunction) {
   const firstStep = routine.steps[0];
   if (!firstStep) {
      return;
   }

   const run = useRoutineRunStore.getState().startRun(routine);
   navigate(getStepRoutePath(firstStep), { state: buildStepLocationState(firstStep, run.token, 0) });
}

export function continueToNextStep(navigate: NavigateFunction) {
   const { run, advanceToNextStep } = useRoutineRunStore.getState();
   if (!run) {
      return;
   }

   const nextIndex = run.currentStepIndex + 1;
   const nextStep = run.steps[nextIndex];
   if (!nextStep) {
      return;
   }

   advanceToNextStep();
   navigate(getStepRoutePath(nextStep), { state: buildStepLocationState(nextStep, run.token, nextIndex) });
}
