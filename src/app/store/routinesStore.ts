import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Routine, RoutineStep, RoutineStepInput, RoutineStepUpdate } from "../data/routines";

function createId() {
   return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type RoutinesStore = {
   routines: Routine[];
   activeRoutineId: string | null;

   createRoutine: (name: string) => Routine;
   updateRoutine: (routineId: string, updates: Partial<Pick<Routine, "name">>) => void;
   deleteRoutine: (routineId: string) => void;

   addStep: (routineId: string, step: RoutineStepInput) => void;
   updateStep: (routineId: string, stepId: string, updates: RoutineStepUpdate) => void;
   removeStep: (routineId: string, stepId: string) => void;
   reorderSteps: (routineId: string, orderedStepIds: string[]) => void;

   setActiveRoutineId: (routineId: string | null) => void;
};

export const useRoutinesStore = create<RoutinesStore>()(
   persist(
      (set) => ({
         routines: [],
         activeRoutineId: null,

         createRoutine: (name) => {
            const now = new Date().toISOString();

            const routine: Routine = {
               id: createId(),
               name,
               steps: [],
               createdAt: now,
               updatedAt: now,
            };

            set((state) => ({ routines: [...state.routines, routine] }));

            return routine;
         },

         updateRoutine: (routineId, updates) => {
            const now = new Date().toISOString();

            set((state) => ({
               routines: state.routines.map((routine) =>
                  routine.id === routineId ? { ...routine, ...updates, updatedAt: now } : routine
               ),
            }));
         },

         deleteRoutine: (routineId) => {
            set((state) => ({
               routines: state.routines.filter((routine) => routine.id !== routineId),
               activeRoutineId: state.activeRoutineId === routineId ? null : state.activeRoutineId,
            }));
         },

         addStep: (routineId, step) => {
            const now = new Date().toISOString();
            const newStep = { ...step, id: createId() } as RoutineStep;

            set((state) => ({
               routines: state.routines.map((routine) =>
                  routine.id === routineId
                     ? { ...routine, steps: [...routine.steps, newStep], updatedAt: now }
                     : routine
               ),
            }));
         },

         updateStep: (routineId, stepId, updates) => {
            const now = new Date().toISOString();

            set((state) => ({
               routines: state.routines.map((routine) =>
                  routine.id === routineId
                     ? {
                          ...routine,
                          steps: routine.steps.map((step) =>
                             step.id === stepId ? ({ ...step, ...updates } as RoutineStep) : step
                          ),
                          updatedAt: now,
                       }
                     : routine
               ),
            }));
         },

         removeStep: (routineId, stepId) => {
            const now = new Date().toISOString();

            set((state) => ({
               routines: state.routines.map((routine) =>
                  routine.id === routineId
                     ? { ...routine, steps: routine.steps.filter((step) => step.id !== stepId), updatedAt: now }
                     : routine
               ),
            }));
         },

         reorderSteps: (routineId, orderedStepIds) => {
            const now = new Date().toISOString();

            set((state) => ({
               routines: state.routines.map((routine) => {
                  if (routine.id !== routineId) {
                     return routine;
                  }

                  const stepsById = new Map(routine.steps.map((step) => [step.id, step]));
                  const steps = orderedStepIds
                     .map((stepId) => stepsById.get(stepId))
                     .filter((step): step is RoutineStep => Boolean(step));

                  return { ...routine, steps, updatedAt: now };
               }),
            }));
         },

         setActiveRoutineId: (routineId) => set({ activeRoutineId: routineId }),
      }),
      {
         name: "hiyori-routines",
         version: 1,
      }
   )
);
