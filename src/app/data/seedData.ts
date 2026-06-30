import type { HiyoriData } from "./types";

const now = new Date().toISOString();

// Starter data for a fresh install/profile.
// The storage layer uses this only when no saved Hiyori data exists yet.
export const seedData: HiyoriData = {
   version: 1,
   decks: [
      {
         id: "1",
         title: "JLPT N5 Vocabulary",
         masteryPerfectSessions: 0,
         createdAt: now,
         updatedAt: now,
         cards: [
            {
               id: "1",
               kanji: "食べる",
               kana: "たべる",
               romaji: "taberu",
               meaning: "to eat",
               createdAt: now,
               updatedAt: now,
            },
         ],
      },
   ],
   journalEntries: [],
   studyLog: [],
};
