import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Card, Deck } from '../data/types';
import { seedData } from '../data/seedData';
import { createInitialSrsState, scheduleNextReview, type SrsGrade } from '../data/srs';


function createId() {
   return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}


type CardInput = Pick<Card, "kanji" | "kana" | "romaji" | "meaning">;

type DecksStore = {
   decks: Deck[];

   createDeck: (title: string) => Deck;
   importDeck: (title: string, cards: CardInput[]) => Deck;
   updateDeck: (deckId: string, updates: Partial<Pick<Deck, "title">>) => void;
   deleteDeck: (deckId: string) => void;

   recordDeckMasteryStep: (deckId: string) => void;

   recordCardReview: (deckId: string, cardId: string, grade: SrsGrade) => void;

   addCard: (deckId: string, card: CardInput) => void;
   updateCard: (deckId: string, cardId: string, updates: Partial<CardInput>) => void;
   deleteCard: (deckId: string, cardId: string) => void;
   bulkDeleteCards: (deckId: string, cardIds: string[]) => void;
};


export const useDecksStore = create<DecksStore>()(
   persist(
      (set)=>({
      
         decks: seedData.decks,

         // deck actions

         createDeck: (title) => {
            const now = new Date().toISOString();

            const deck: Deck = {
               id: createId(),
               title,
               cards: [],
               masteryPerfectSessions: 0,
               createdAt: now,
               updatedAt: now,
            }

            set((state) => ({
               decks: [...state.decks, deck],
            }));
            
            return deck;
         },

         importDeck: (title, cards) => {
            const now = new Date().toISOString();

            const deck: Deck = {
               id: createId(),
               title,
               masteryPerfectSessions: 0,
               cards: cards.map((card) => ({
                  id: createId(),
                  ...card,
                  srs: createInitialSrsState(),
                  createdAt: now,
                  updatedAt: now,
               })),
               createdAt: now,
               updatedAt: now,
            };

            set((state) => ({
               decks: [...state.decks, deck],
            }));

            return deck;
         },

         updateDeck: (deckId, updates) => {
            const now = new Date().toISOString();

            set((state) => ({
               decks: state.decks.map((deck) =>
                  deck.id === deckId
                  ? { ...deck, ...updates, updatedAt: now }
                  : deck
               )
            }))
         }, 

         deleteDeck: (deckId) => {
            set((state) => ({
               decks: state.decks.filter((deck) => deck.id !== deckId),
            }));
         },

         // deck mastery actions

         recordDeckMasteryStep: (deckId) => {
            const now = new Date().toISOString();

            set((state) => ({
               decks: state.decks.map((deck) =>
                  deck.id === deckId
                  ? {
                     ...deck,
                     masteryPerfectSessions: Math.min((deck.masteryPerfectSessions ?? 0) + 1, 5),
                     updatedAt: now,
                  }
                  : deck
               ),
            }));
         },

         // card review (SRS) actions

         recordCardReview: (deckId, cardId, grade) => {
            const now = new Date().toISOString();

            set((state) => ({
               decks: state.decks.map((deck) => {
                  if (deck.id !== deckId) {
                     return deck;
                  }

                  return {
                     ...deck,
                     cards: deck.cards.map((card) =>
                        card.id === cardId
                        ? {
                           ...card,
                           srs: scheduleNextReview(card.srs, grade),
                           updatedAt: now,
                        }
                        : card
                     ),
                     updatedAt: now,
                  };
               }),
            }));
         },

         // card actions

         addCard: (deckId, card) => {
            const now = new Date().toISOString();

            const newCard: Card = {
               id: createId(),
               ...card,
               srs: createInitialSrsState(),
               createdAt: now,
               updatedAt: now,
            };

            set((state) => ({
               decks: state.decks.map((deck) =>
                  deck.id === deckId
                  ? {
                     ...deck,
                     cards: [...deck.cards, newCard],
                     updatedAt: now,
                  }
                  : deck
               ),
            }));
         },

         updateCard: (deckId, cardId, updates) => {
            const now = new Date().toISOString();

            set((state) => ({
               decks: state.decks.map((deck) =>
                  deck.id === deckId
                  ? {
                        ...deck,
                        cards: deck.cards.map((card) =>
                           card.id === cardId
                           ? {...card, ...updates, updatedAt: now}
                           : card
                        ),
                        updatedAt: now,
                     }
                  : deck
               ),
            }));
         },

         deleteCard: (deckId, cardId) => {
            const now = new Date().toISOString();

            set((state) => ({
               decks: state.decks.map((deck) =>
                  deck.id === deckId
                  ? {
                        ...deck,
                        cards: deck.cards.filter((card) => card.id !== cardId),
                        updatedAt: now,
                     }
                  : deck
               ),
            }));
         },

         bulkDeleteCards: (deckId, cardIds) => {
            const now = new Date().toISOString();
            const idSet = new Set(cardIds);

            set((state) => ({
               decks: state.decks.map((deck) =>
                  deck.id === deckId
                  ? {
                        ...deck,
                        cards: deck.cards.filter((card) => !idSet.has(card.id)),
                        updatedAt: now,
                     }
                  : deck
               ),
            }));
         },
      }),
      {
         name: "hiyori-decks",
         version: 2,
         // v2 adds SRS scheduling to each card. Older saved data (v1 or unversioned)
         // won't have `card.srs`, so backfill it rather than resetting progress.
         migrate: (persistedState, version) => {
            const state = persistedState as { decks?: Deck[] } | undefined;
            const decks = state?.decks ?? [];

            if (version >= 2) {
               return state as DecksStore;
            }

            const migratedDecks = decks.map((deck) => ({
               ...deck,
               cards: deck.cards.map((card) => ({
                  ...card,
                  srs: card.srs ?? createInitialSrsState(),
               })),
            }));

            // Only `decks` round-trips through JSON; zustand merges this onto the
            // store's live actions on rehydration, so a partial cast here is safe.
            return { ...state, decks: migratedDecks } as DecksStore;
         },
      }
   )
);
