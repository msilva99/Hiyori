import { useState } from "react";
import { useDecksStore } from "../store/decksStore";

export function DecksStorePlayground() {
   const decks = useDecksStore((state) => state.decks);
   const createDeck = useDecksStore((state) => state.createDeck);
   const updateDeck = useDecksStore((state) => state.updateDeck);
   const deleteDeck = useDecksStore((state) => state.deleteDeck);

   const recordDeckMasteryStep = useDecksStore((state) => state.recordDeckMasteryStep);
   
   const addCard = useDecksStore((state) => state.addCard);
   const updateCard = useDecksStore((state) => state.updateCard);
   const deleteCard = useDecksStore((state) => state.deleteCard);

   const [title, setTitle] = useState("");

   const handleCreateDeck = () => {
      if (!title.trim()) return;

      createDeck(title.trim());
      setTitle("");
   };

   return (
      <div className="space-y-6 p-8">
         <div>
         <h1 className="text-3xl font-bold">Decks Store Playground</h1>
         <p className="text-gray-500">
            Temporary page for testing Zustand deck state.
         </p>
         </div>

         <div className="flex gap-2">
         <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Deck title"
            className="border px-3 py-2 rounded"
         />

         <button
            onClick={handleCreateDeck}
            className="bg-black text-white px-4 py-2 rounded"
         >
            Create Deck
         </button>
         </div>

         <div className="space-y-3">
         {decks.map((deck) => (
            <div key={deck.id} className="border rounded p-4 flex items-center justify-between">
               <div>
               <h2 className="font-bold">{deck.title}</h2>
               <p className="text-sm text-gray-500">
                  {deck.cards.length} cards · mastery {deck.masteryPerfectSessions}/5
               </p>

               {deck.cards.length > 0 && (
                  <ul className="mt-3 space-y-1">
                     {deck.cards.map((card) => (
                        <li key={card.id} className="text-sm">
                           
                           <span className="font-medium">{card.kanji || card.kana}</span>
                           
                           <span className="text-gray-500">
                              {" "}({card.romaji}) - {card.meaning}
                           </span>

                           <button
                              onClick={() =>
                                 updateCard(deck.id, card.id, {
                                    meaning: `${card.meaning} updated`,
                                 })
                              }
                              className="border px-2 py-0.5 rounded"
                           >
                              Update Card
                           </button>

                           <button
                              onClick={() =>
                                 deleteCard(deck.id, card.id)
                              }
                              className="border ml-4 px-3 py-1 rounded"
                           >
                              Delete card
                           </button>

                        </li>
                     ))}
                  </ul>
               )}
               </div>

               <div className="flex gap-2">
                  <button
                     onClick={() =>
                        addCard(deck.id, {
                           kanji: "猫",
                           kana: "ねこ",
                           romaji: "neko",
                           meaning: "cat",
                        })
                     }
                     className="border px-3 py-1 rounded"
                  >
                     {/* Later: add some warning modal confirming if duplicate word should be added */}
                     Add Card
                  </button>
                  
                  <button
                     onClick={() =>
                        recordDeckMasteryStep(deck.id)
                     }
                     className="border px-3 py-1 rounded"
                  >
                     Study
                  </button>
                  
                  <button
                     onClick={() =>
                        updateDeck(deck.id, {
                           title: `${deck.title} updated`,
                        })
                     }
                     className="border px-3 py-1 rounded"
                  >
                     Rename
                  </button>

                  <button
                     onClick={() => deleteDeck(deck.id)}
                     className="border px-3 py-1 rounded text-red-600"
                  >
                     Delete
                  </button>
               </div>
            </div>
         ))}
         </div>
      </div>
   );
}