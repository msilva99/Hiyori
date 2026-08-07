import { useRef } from "react";
import { isCardDue } from "./srs";
import type { Card, Deck } from "./types";

// A card tagged with the deck it came from, so a session that mixes cards from
// several decks still knows where to write SRS/study-log updates back to.
export type SessionCard = Card & { deckId: string; deckTitle: string };

export function shuffleCards<T>(items: T[]): T[] {
   const shuffled = [...items];

   for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
   }

   return shuffled;
}

export function getCardFront(card: Card) {
   // Study cards deliberately ignore romaji: front is Japanese, back is meaning.
   return card.kanji || card.kana || "No prompt";
}

export function getCardPrompt(card: Card) {
   return card.kanji || card.kana || card.meaning;
}

function tagCards(deck: Deck): SessionCard[] {
   return deck.cards.map((card) => ({ ...card, deckId: deck.id, deckTitle: deck.title }));
}

export function collectSessionCards(decks: Deck[], deckIds: string[]): SessionCard[] {
   const idSet = new Set(deckIds);
   return decks.filter((deck) => idSet.has(deck.id)).flatMap(tagCards);
}

export function collectDueSessionCards(decks: Deck[], deckIds: string[]): SessionCard[] {
   return collectSessionCards(decks, deckIds).filter((card) => isCardDue(card));
}

// Looks a single card back up by id rather than trusting a stored snapshot, so a
// resumed session always reflects the card's current text/SRS state and quietly
// drops cards that were edited out of existence (deck/card deleted) since it started.
export function resolveSessionCard(decks: Deck[], ref: { cardId: string; deckId: string }): SessionCard | null {
   const deck = decks.find((candidate) => candidate.id === ref.deckId);
   const card = deck?.cards.find((candidate) => candidate.id === ref.cardId);

   if (!deck || !card) {
      return null;
   }

   return { ...card, deckId: deck.id, deckTitle: deck.title };
}

// ~8s/card covers reading the prompt, deciding, flipping, and grading - a rough
// but reasonable average across easy vocab and trickier words.
const SECONDS_PER_CARD = 8;

export function estimateSessionSeconds(cardCount: number) {
   return cardCount * SECONDS_PER_CARD;
}

const TRANSITION_LOCK_MS = 260;

// The card flip/advance animation takes ~200ms. Framer Motion's exit tracking can get
// stuck if a new transition starts before the previous one finishes (e.g. holding down a
// grading key triggers OS key-repeat), so callers wrap each reveal/grade action in this
// lock to ignore re-triggers until the current transition has had time to settle.
export function useTransitionLock() {
   const isLockedRef = useRef(false);

   return (action: () => void) => {
      if (isLockedRef.current) {
         return;
      }

      isLockedRef.current = true;
      window.setTimeout(() => {
         isLockedRef.current = false;
      }, TRANSITION_LOCK_MS);
      action();
   };
}

export function formatEstimatedDuration(cardCount: number) {
   const totalSeconds = estimateSessionSeconds(cardCount);
   const totalMinutes = Math.round(totalSeconds / 60);

   if (totalMinutes < 1) {
      return "under a minute";
   }

   if (totalMinutes < 60) {
      return `~${totalMinutes} min`;
   }

   const hours = Math.floor(totalMinutes / 60);
   const minutes = totalMinutes % 60;

   return minutes === 0 ? `~${hours} hr` : `~${hours} hr ${minutes} min`;
}
