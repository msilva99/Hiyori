import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Card, Deck } from '../data/types';
import { seedData } from '../data/seedData';


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

         // card actions

         addCard: (deckId, card) => {
            const now = new Date().toISOString();

            const newCard: Card = {
               id: createId(),
               ...card,
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
      }
   )
);
