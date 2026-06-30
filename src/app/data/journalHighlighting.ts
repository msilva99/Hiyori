import type { Deck } from "./types";

export type VocabularyMatch = {
   searchable: string[];

   cardId: string;

   deckId: string;
   deckTitle: string;

   kanji: string;
   kana: string;
   romaji: string;
   meaning: string;
};

export type ParsedToken =
   | {
        type: "text";
        content: string;
     }
   | {
        type: "highlight";
        content: string;
        matches: VocabularyMatch[];
     };

// Build the searchable vocabulary list

export function buildVocabularyIndex(
   decks: Deck[],
): VocabularyMatch[] {

   const vocabulary: VocabularyMatch[] = [];

   for (const deck of decks) {
      for (const card of deck.cards) {

         vocabulary.push({
            searchable: [
               card.kanji,
               card.kana,
               card.romaji,
            ].filter(Boolean),

            cardId: card.id,

            deckId: deck.id,
            deckTitle: deck.title,

            kanji: card.kanji,
            kana: card.kana,
            romaji: card.romaji,
            meaning: card.meaning,
         });
      }
   }

   // Longest searchable forms first
   vocabulary.sort((a, b) => {

      const longestA = Math.max(
         ...a.searchable.map(s => s.length)
      );

      const longestB = Math.max(
         ...b.searchable.map(s => s.length)
      );

      return longestB - longestA;
   });

   return vocabulary;
}

// Parser of journal text

export function parseJournalText(
   text: string,
   vocabulary: VocabularyMatch[],
): ParsedToken[] {
   const tokens: ParsedToken[] = [];

   let currentIndex = 0;

   while (currentIndex < text.length) {
      let matchedVocabulary: VocabularyMatch[] = [];
      let matchedText = "";

      for (const vocab of vocabulary) {
         for (const form of vocab.searchable) {

            if (!form.trim()) continue;

            if (text.startsWith(form, currentIndex)) {

               if (form.length > matchedText.length) {
                  matchedText = form;
                  matchedVocabulary = [vocab];
               } else if (form === matchedText) {
                  matchedVocabulary.push(vocab);
               }
            }
         }
      }

      // Found a vocabulary match
      if (matchedText) {

         console.log(
            matchedVocabulary.map(v => ({
               deckId: v.deckId,
               cardId: v.cardId,
               kanji: v.kanji,
            }))
         );
         
         tokens.push({
            type: "highlight",
            content: matchedText,
            matches: matchedVocabulary,
         });

         currentIndex += matchedText.length;
      } else {
         tokens.push({
            type: "text",
            content: text[currentIndex],
         });

         currentIndex += 1;
      }
   }

   return tokens;
}