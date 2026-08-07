import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TestGrade = "again" | "good" | "easy";

export type TestCardRef = { cardId: string; deckId: string };

export type TestResult = TestCardRef & { grade: TestGrade };

type TestSession = {
   deckIds: string[];
   cardOrder: TestCardRef[];
   currentIndex: number;
   results: TestResult[];
};

type TestSessionStore = {
   session: TestSession | null;
   startSession: (deckIds: string[], cardOrder: TestCardRef[]) => void;
   gradeCurrentCard: (grade: TestGrade) => void;
   skipCurrentCard: () => void;
   endEarly: () => void;
   clearSession: () => void;
};

// Persisted so a long test (hundreds of words) survives closing the tab or app -
// only one test is ever in progress at a time, so this is a single nullable slot
// rather than a list, and starting a new one always replaces whatever was there.
export const useTestSessionStore = create<TestSessionStore>()(
   persist(
      (set) => ({
         session: null,

         startSession: (deckIds, cardOrder) => set({ session: { deckIds, cardOrder, currentIndex: 0, results: [] } }),

         gradeCurrentCard: (grade) =>
            set((state) => {
               if (!state.session) {
                  return state;
               }

               const current = state.session.cardOrder[state.session.currentIndex];
               if (!current) {
                  return state;
               }

               return {
                  session: {
                     ...state.session,
                     currentIndex: state.session.currentIndex + 1,
                     results: [...state.session.results, { ...current, grade }],
                  },
               };
            }),

         // Advances past a card without grading it - used when the underlying
         // card/deck has been deleted since the test started, so it can't be shown.
         skipCurrentCard: () =>
            set((state) =>
               state.session ? { session: { ...state.session, currentIndex: state.session.currentIndex + 1 } } : state
            ),

         // Jumps straight to results using whatever was already graded - the
         // remaining ungraded cards are just left out, not counted against you.
         endEarly: () =>
            set((state) =>
               state.session
                  ? { session: { ...state.session, currentIndex: state.session.cardOrder.length } }
                  : state
            ),

         clearSession: () => set({ session: null }),
      }),
      {
         name: "hiyori-test-session",
         version: 1,
      }
   )
);
