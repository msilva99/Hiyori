import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seedData } from "../data/seedData";
import type { JournalEntry } from "../data/types";
import { loadLegacyHiyoriData } from "./legacyStorage";

type JournalStore = {
   journalEntries: JournalEntry[];
   saveJournalEntry: (entry: JournalEntry) => void;
   deleteJournalEntry: (entryId: string) => void;
};

function getInitialJournalEntries() {
   return loadLegacyHiyoriData()?.journalEntries ?? seedData.journalEntries;
}

export const useJournalStore = create<JournalStore>()(
   persist(
      (set) => ({
         journalEntries: getInitialJournalEntries(),

         saveJournalEntry: (entry) => {
            set((state) => {
               const existingEntry = state.journalEntries.find((item) => item.id === entry.id);

               return {
                  journalEntries: existingEntry
                     ? state.journalEntries.map((item) => (item.id === entry.id ? entry : item))
                     : [...state.journalEntries, entry],
               };
            });
         },

         deleteJournalEntry: (entryId) => {
            set((state) => ({
               journalEntries: state.journalEntries.filter((entry) => entry.id !== entryId),
            }));
         },
      }),
      {
         name: "hiyori-journal",
      }
   )
);
