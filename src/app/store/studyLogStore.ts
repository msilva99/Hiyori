import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seedData } from "../data/seedData";
import type { StudyLogEntry } from "../data/types";
import { loadLegacyHiyoriData } from "./legacyStorage";

function createId() {
   return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type StudyLogInput = Pick<StudyLogEntry, "deckId" | "cardsStudied" | "correctAttempts" | "wrongAttempts">;

type StudyLogStore = {
   studyLog: StudyLogEntry[];
   recordStudyLogEntry: (entry: StudyLogInput) => void;
};

function getInitialStudyLog() {
   return loadLegacyHiyoriData()?.studyLog ?? seedData.studyLog;
}

export const useStudyLogStore = create<StudyLogStore>()(
   persist(
      (set) => ({
         studyLog: getInitialStudyLog(),

         recordStudyLogEntry: (entry) => {
            const studyLogEntry: StudyLogEntry = {
               id: createId(),
               studiedAt: new Date().toISOString(),
               ...entry,
            };

            set((state) => ({
               studyLog: [...state.studyLog, studyLogEntry],
            }));
         },
      }),
      {
         name: "hiyori-study-log",
      }
   )
);
