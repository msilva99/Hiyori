import type { Deck } from "./types";
import { collectDueSessionCards, collectSessionCards } from "./studySession";

export type StudyRoutineStep = {
   id: string;
   type: "study";
   deckIds: string[];
   wordLimit: number | "all";
};

export type TestRoutineStep = {
   id: string;
   type: "test";
   deckIds: string[];
};

export type RoutineStep = StudyRoutineStep | TestRoutineStep;

// Omit<Union, K> collapses to only the properties common across every member
// (losing e.g. wordLimit, which only StudyRoutineStep has) unless it's forced
// to distribute over the union first.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type DistributivePartial<T> = T extends unknown ? Partial<T> : never;

export type RoutineStepInput = DistributiveOmit<RoutineStep, "id">;
export type RoutineStepUpdate = DistributivePartial<DistributiveOmit<RoutineStep, "id" | "type">>;

export type Routine = {
   id: string;
   name: string;
   steps: RoutineStep[];
   createdAt: string;
   updatedAt: string;
};

export type RoutineStepLocationState = {
   deckIds: string[];
   wordLimit?: number | "all";
   routineToken: string;
   routineStepIndex: number;
};

export function getStepRoutePath(step: RoutineStep) {
   return step.type === "study" ? "/study/session" : "/test";
}

export function buildStepLocationState(step: RoutineStep, token: string, stepIndex: number): RoutineStepLocationState {
   return {
      deckIds: step.deckIds,
      ...(step.type === "study" ? { wordLimit: step.wordLimit } : {}),
      routineToken: token,
      routineStepIndex: stepIndex,
   };
}

export function getStepSummary(step: RoutineStep, decks: Deck[]) {
   const deckLabel =
      decks
         .filter((deck) => step.deckIds.includes(deck.id))
         .map((deck) => deck.title)
         .join(", ") || "No decks selected";

   if (step.type === "study") {
      const dueCount = collectDueSessionCards(decks, step.deckIds).length;
      const wordLabel =
         step.wordLimit === "all" ? `${dueCount} due` : `${Math.min(step.wordLimit, dueCount)} of ${dueCount} due`;
      return `Study: ${deckLabel} · ${wordLabel}`;
   }

   const totalCount = collectSessionCards(decks, step.deckIds).length;
   return `Test: ${deckLabel} · ${totalCount} word${totalCount !== 1 ? "s" : ""}`;
}
