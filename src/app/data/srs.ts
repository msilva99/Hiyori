// SM-2-lite: a simplified spaced-repetition schedule using 3 review grades
// (again/good/easy) instead of SM-2's usual 5, to match the study session's
// 3-button grading UI.
import { addDays } from "date-fns";
import type { Card, CardSrsState } from "./types";

export type SrsGrade = "again" | "good" | "easy";

const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const MAX_EASE_FACTOR = 3.0;
const EASY_INTERVAL_BONUS = 1.3;

export function createInitialSrsState(referenceDate: Date = new Date()): CardSrsState {
   return {
      dueDate: referenceDate.toISOString(),
      interval: 0,
      easeFactor: DEFAULT_EASE_FACTOR,
      repetitions: 0,
   };
}

export function isCardDue(card: Card, referenceDate: Date = new Date()) {
   const srs = card.srs ?? createInitialSrsState(referenceDate);
   return new Date(srs.dueDate).getTime() <= referenceDate.getTime();
}

export function scheduleNextReview(
   srs: CardSrsState,
   grade: SrsGrade,
   referenceDate: Date = new Date()
): CardSrsState {
   if (grade === "again") {
      return {
         repetitions: 0,
         interval: 1,
         easeFactor: Math.max(MIN_EASE_FACTOR, srs.easeFactor - 0.2),
         dueDate: addDays(referenceDate, 1).toISOString(),
      };
   }

   const repetitions = srs.repetitions + 1;
   let interval: number;

   if (repetitions === 1) {
      interval = 1;
   } else if (repetitions === 2) {
      interval = 6;
   } else {
      interval = Math.round(srs.interval * srs.easeFactor);
   }

   if (grade === "easy") {
      interval = Math.round(interval * EASY_INTERVAL_BONUS);
   }

   const easeFactor = grade === "easy"
      ? Math.min(MAX_EASE_FACTOR, srs.easeFactor + 0.15)
      : srs.easeFactor;

   return {
      repetitions,
      interval,
      easeFactor,
      dueDate: addDays(referenceDate, interval).toISOString(),
   };
}
