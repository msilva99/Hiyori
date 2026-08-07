import { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { createPortal } from "react-dom";
import { useParams, Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { 
   ArrowLeft, 
   Book, 
   CheckCircle,
   CheckSquare,
   ChevronDown,
   Download,
   Play, 
   Edit2, 
   Trash2, 
   Search,
   Plus,
   Save,
   X
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useDecksStore } from "../store/decksStore";
import { Modal } from "../components/Modal";
import type { Card } from "../data/types";

const deckColorClasses = [
   "bg-deck-pine",
   "bg-deck-sand",
   "bg-deck-sky",
   "bg-deck-rose",
   "bg-deck-cream",
   "bg-deck-mist",
];

function getDeckColor(index: number) {
   return deckColorClasses[index % deckColorClasses.length];
}

function getDeckMastery(deck: { masteryPerfectSessions: number }) {
   return Math.min(deck.masteryPerfectSessions, 5) * 20;
}

export function DeckDetail() {
   const { id } = useParams();
   const navigate = useNavigate();
   const decks = useDecksStore((state) => state.decks);
   const updateDeck = useDecksStore((state) => state.updateDeck);
   const deleteDeck = useDecksStore((state) => state.deleteDeck);
   const addCard = useDecksStore((state) => state.addCard);
   const updateCard = useDecksStore((state) => state.updateCard);
    const deleteCard = useDecksStore((state) => state.deleteCard);
    const bulkDeleteCards = useDecksStore((state) => state.bulkDeleteCards);

   // The URL id selects the deck from shared data. This replaces the old one-page mock deck.
   const deckIndex = decks.findIndex((item) => item.id === id);
   const deck = deckIndex >= 0 ? decks[deckIndex] : undefined;
   const deckColor = getDeckColor(Math.max(deckIndex, 0));
   const words = deck?.cards ?? [];
   const totalCards = words.length;
   const progress = deck ? getDeckMastery(deck) : 0;

   const [searchQuery, setSearchQuery] = useState("");
   
   // Edit States
   const [isEditingInfo, setIsEditingInfo] = useState(false);
   const [editTitle, setEditTitle] = useState("");
   
   // Word Edit States
   const [editingWordId, setEditingWordId] = useState<string | null>(null);
   const [editWordKanji, setEditWordKanji] = useState("");
   const [editWordKana, setEditWordKana] = useState("");
   const [editWordRomaji, setEditWordRomaji] = useState("");
   const [editWordMeaning, setEditWordMeaning] = useState("");
   const [isAddingWord, setIsAddingWord] = useState(false);
   const [duplicateWarning, setDuplicateWarning] = useState<{
      newCard: Omit<Card, "id" | "createdAt" | "updatedAt" | "srs">;
      exactMatches: Card[];
      similarMatches: Card[];
   } | null>(null);
   const [deleteConfirm, setDeleteConfirm] = useState<Card | null>(null);
   const [showBulkMenu, setShowBulkMenu] = useState(false);
   const [isBulkMode, setIsBulkMode] = useState(false);
   const [bulkAction, setBulkAction] = useState<'edit' | 'delete' | null>(null);
   const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
   const [editingWordIds, setEditingWordIds] = useState<Set<string>>(new Set());
   const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<string[] | null>(null);
   const [bulkEditValues, setBulkEditValues] = useState<Record<string, { kanji: string; kana: string; romaji: string; meaning: string }>>({});
   // Export Toast
   const [showToast, setShowToast] = useState(false);

   if (!deck) {
      return (
         <div className="space-y-6 font-sans max-w-5xl mx-auto w-full">
            <Link to="/decks" className="inline-flex items-center gap-2 text-ink-muted hover:text-brand font-medium transition-colors text-sm">
               <ArrowLeft className="w-4 h-4" /> Back to Decks
            </Link>
            <div className="bg-surface rounded-4xl p-10 border border-border-hiyori shadow-sm text-center">
               <h1 className="text-3xl font-extrabold text-ink tracking-tight">Deck not found</h1>
               <p className="text-ink-muted mt-3">This deck may have been deleted or the link may be incorrect.</p>
            </div>
         </div>
      );
   }

   const handleDeleteDeck = () => {
      if (confirm("Are you absolutely sure you want to delete this deck? This cannot be undone.")) {
         deleteDeck(deck.id);
         navigate("/decks");
      }
   };

   

    // Export Deck
   const handleExportDeck = () => {
      const exportData = {
         title: deck.title,
         cards: deck.cards.map(card => ({
            kanji: card.kanji,
            kana: card.kana,
            romaji: card.romaji,
            meaning: card.meaning,
         })),
      };

      const json = JSON.stringify(exportData, null, 2);

      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${deck.title || "deck"}.json`;
      a.click();

      URL.revokeObjectURL(url);

      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
   };
   
   // const handleExportClick = () => {
   //    deck
   // };

   

   const handleSaveInfo = () => {
      updateDeck(deck.id, { title: editTitle.trim() || "Untitled Deck" });
      setIsEditingInfo(false);
   };

   const handleEditWord = (word: Card) => {
      // Copy the selected row into edit state so the table can become a controlled form.
      setEditingWordId(word.id);
      setEditWordKanji(word.kanji);
      setEditWordKana(word.kana);
      setEditWordRomaji(word.romaji);
      setEditWordMeaning(word.meaning);
      setIsAddingWord(false);
   };

   const handleSaveWord = () => {
      const wordFields = {
         kanji: editWordKanji.trim(),
         kana: editWordKana.trim(),
         romaji: editWordRomaji.trim(),
         meaning: editWordMeaning.trim()
      };

      if (!wordFields.kanji && !wordFields.kana && !wordFields.romaji && !wordFields.meaning) {
         return;
      }

      // Exclude the card being edited from duplicate checks
      const otherCards = deck.cards.filter(card => card.id !== editingWordId);

      const exactMatches = otherCards.filter(card =>
         card.kanji === wordFields.kanji &&
         card.kana === wordFields.kana &&
         card.meaning === wordFields.meaning
      );

      // Same kanji AND kana, but different meaning
      const similarMatches = otherCards.filter(card =>
         card.kanji === wordFields.kanji &&
         card.kana === wordFields.kana &&
         card.meaning !== wordFields.meaning
      );

      if (exactMatches.length > 0) {
         setDuplicateWarning({ newCard: wordFields, exactMatches, similarMatches: [] });
         return;
      }

      if (similarMatches.length > 0) {
         setDuplicateWarning({ newCard: wordFields, exactMatches: [], similarMatches });
         return;
      }

      commitSaveWord(wordFields);
   };

   const commitSaveWord = (wordFields: { kanji: string; kana: string; romaji: string; meaning: string }) => {
      if (isAddingWord) {
         addCard(deck.id, wordFields);
      } else if (editingWordId) {
         updateCard(deck.id, editingWordId, wordFields);
      }
      setDuplicateWarning(null);
      resetWordForm();
   };

   const handleStartAddWord = () => {
      // The add flow reuses the table's edit controls so the UI stays compact.
      setIsAddingWord(true);
      setEditingWordId(null);
      setEditWordKanji("");
      setEditWordKana("");
      setEditWordRomaji("");
      setEditWordMeaning("");
   };

   const resetWordForm = () => {
      setEditingWordId(null);
      setIsAddingWord(false);
      setEditWordKanji("");
      setEditWordKana("");
      setEditWordRomaji("");
      setEditWordMeaning("");
   };

   const handleDeleteWord = () => {
      if (!deleteConfirm) return;
      deleteCard(deck.id, deleteConfirm.id);
      setDeleteConfirm(null);
   };

   // Search checks every visible vocabulary field so the table feels forgiving.
   const filteredWords = words.filter(w =>
      w.kanji.includes(searchQuery) ||
      w.kana.includes(searchQuery) ||
      w.romaji.includes(searchQuery.toLowerCase()) ||
      w.meaning.toLowerCase().includes(searchQuery.toLowerCase())
   );

   // Decks can run into the hundreds/thousands of cards (e.g. imported JLPT lists), so the
   // word list is virtualized: only the rows actually in view get mounted, no matter how
   // many cards the deck has. Row height varies a little (view vs. inline-edit), so sizes
   // are measured from the real rendered row rather than assumed.
   const tableScrollRef = useRef<HTMLDivElement>(null);
   const rowVirtualizer = useVirtualizer({
      count: filteredWords.length,
      getScrollElement: () => tableScrollRef.current,
      estimateSize: () => 76,
      overscan: 8,
   });
   const showBulkCheckboxColumn = isBulkMode && bulkAction === 'delete';
   const wordTableColumns = showBulkCheckboxColumn
      ? "48px minmax(140px,1.2fr) minmax(120px,1fr) minmax(160px,1.6fr) minmax(88px,auto)"
      : "minmax(140px,1.2fr) minmax(120px,1fr) minmax(160px,1.6fr) minmax(88px,auto)";

    // Bulk mode handlers
   const enterBulkMode = (action: 'edit' | 'delete') => {
      setBulkAction(action);
      setIsBulkMode(true);
      setShowBulkMenu(false);
      setEditingWordId(null);
      setIsAddingWord(false);
      setSelectedCardIds(new Set());
      setEditingWordIds(new Set());
      if (action === 'edit') {
         const allIds = filteredWords.map(w => w.id);
         const values: Record<string, { kanji: string; kana: string; romaji: string; meaning: string }> = {};
         for (const word of filteredWords) {
            values[word.id] = { kanji: word.kanji, kana: word.kana, romaji: word.romaji, meaning: word.meaning };
         }
         setEditingWordIds(new Set(allIds));
         setBulkEditValues(values);
         setSelectedCardIds(new Set(allIds));
      }
   };

   const exitBulkMode = () => {
      setIsBulkMode(false);
      setBulkAction(null);
      setSelectedCardIds(new Set());
      setEditingWordIds(new Set());
      setBulkEditValues({});
   };

   const toggleSelectCard = (id: string) => {
      setSelectedCardIds(prev => {
         const next = new Set(prev);
         if (next.has(id)) next.delete(id);
         else next.add(id);
         return next;
      });
   };

   const toggleSelectAll = () => {
      if (selectedCardIds.size === filteredWords.length) {
         setSelectedCardIds(new Set());
      } else {
         setSelectedCardIds(new Set(filteredWords.map(w => w.id)));
      }
   };

   const updateBulkEditValue = (id: string, field: keyof typeof bulkEditValues[string], value: string) => {
      setBulkEditValues(prev => ({
         ...prev,
         [id]: { ...prev[id], [field]: value },
      }));
   };

   const handleBulkDeleteConfirm = () => {
      setBulkDeleteConfirm(Array.from(selectedCardIds));
   };

   const handleBulkDelete = () => {
      if (!bulkDeleteConfirm || bulkDeleteConfirm.length === 0) return;
      bulkDeleteCards(deck.id, bulkDeleteConfirm);
      setBulkDeleteConfirm(null);
      exitBulkMode();
   };

   const handleBulkSaveAll = () => {
      for (const [id, fields] of Object.entries(bulkEditValues)) {
         updateCard(deck.id, id, fields);
      }
      setEditingWordIds(new Set());
      setBulkEditValues({});
   };

   return (
      <>
      <div className="space-y-10 font-sans max-w-5xl mx-auto w-full pb-32">
         {/* Header / Breadcrumb */}
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Link to="/decks" className="inline-flex items-center gap-2 text-ink-muted hover:text-brand font-medium transition-colors mb-6 text-sm">
               <ArrowLeft className="w-4 h-4" /> Back to Decks
            </Link>

            {/* Deck Info Banner */}
            <div className="bg-surface rounded-4xl p-8 border border-border-hiyori shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center gap-8 justify-between">
               <div className="absolute right-0 top-0 w-64 h-64 bg-linear-to-bl from-border-hiyori/30 to-transparent rounded-bl-full -z-10" />
               
               <div className="flex items-center gap-6 z-10">
                  <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 shadow-sm", deckColor, "bg-opacity-20")}>
                     <Book className={cn("w-10 h-10", deckColor.replace("bg-", "text-"))} />
                  </div>
                  <div>
                     {isEditingInfo ? (
                         <div className="flex items-center gap-3 flex-wrap">
                            <input
                               type="text"
                               value={editTitle}
                               onChange={(e) => setEditTitle(e.target.value)}
                               className="text-3xl font-extrabold text-ink bg-surface-hover rounded-xl px-4 py-2 border-2 border-border-hiyori focus:outline-none focus:border-brand max-w-[50vw] lg:max-w-md"
                               autoFocus
                            />
                            <div className="flex items-center gap-2 shrink-0">
                               <button onClick={handleSaveInfo} aria-label="Save deck title" className="p-2 bg-success text-white rounded-xl hover:bg-success-hover transition-colors cursor-pointer">
                                  <Save className="w-5 h-5" />
                               </button>
                               <button onClick={() => setIsEditingInfo(false)} aria-label="Cancel renaming deck" className="p-2 bg-surface-hover text-ink-muted rounded-xl hover:bg-border-hiyori transition-colors cursor-pointer">
                                  <X className="w-5 h-5" />
                               </button>
                            </div>
                         </div>
                     ) : (
                        <div className="flex items-center gap-3">
                           <h1 className="text-4xl font-extrabold text-ink tracking-tight">{deck.title}</h1>
                           <button
                              onClick={() => {
                                 setEditTitle(deck.title);
                                 setIsEditingInfo(true);
                              }}
                              aria-label="Rename deck"
                              className="p-2 text-ink-faint hover:text-brand hover:bg-page rounded-xl transition-all cursor-pointer"
                           >
                              <Edit2 className="w-5 h-5" />
                           </button>
                        </div>
                     )}
                     <div className="flex flex-wrap items-center gap-4 mt-3">
                        <span className="text-ink-muted font-medium bg-surface-hover px-3 py-1 rounded-lg text-sm">{totalCards} cards total</span>
                        <span className="text-brand font-bold bg-brand/10 px-3 py-1 rounded-lg text-sm">{progress}% Mastery</span>
                     </div>
                  </div>
               </div>

               {!isEditingInfo && (
               <div className="z-10 flex shrink-0">
                  {totalCards === 0 ? (
                     <span className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all shadow-sm text-lg bg-surface-hover text-ink-faint">
                        <Play className="w-6 h-6 fill-current" /> Study Now
                     </span>
                  ) : (
                     <div className="flex shrink justify-between gap-4">
                        <button onClick={handleExportDeck} className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border-hiyori bg-surface text-ink font-medium hover:bg-page transition-all shadow-sm cursor-pointer">
                           <Download className="w-5 h-5" /> Export
                        </button>
                        <Link
                           to={`/decks/${deck.id}/study`}
                           className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all shadow-sm text-lg bg-brand text-white hover:bg-brand-hover shadow-brand/20"
                        >
                           <Play className="w-6 h-6 fill-current" /> Study Now
                        </Link>
                     </div>
                  )}
               </div>
               )}
            </div>
         </motion.div>

         {/* Words List Section */}
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
               <h2 className="text-2xl font-bold text-ink">Words & Vocabulary</h2>
               
               <div className="flex items-center gap-3">
                  <div className="relative">
                     <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                     <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search words..." 
                        className="pl-10 pr-4 py-2.5 bg-surface border border-border-hiyori rounded-xl text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all shadow-sm"
                     />
                  </div>
                     {!isBulkMode && (
                     <button onClick={handleStartAddWord} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all shadow-sm cursor-pointer">
                        <Plus className="w-4 h-4" /> Add Word
                     </button>
                     )}
                      {!isBulkMode && <div className="w-px h-6 bg-border-hiyori shrink-0" />}
                      {!isBulkMode && (
                      <div className="relative">
                         <button
                           onClick={() => setShowBulkMenu(!showBulkMenu)}
                           onBlur={() => setTimeout(() => setShowBulkMenu(false), 150)}
                           className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-hiyori bg-surface text-ink-muted font-medium hover:bg-surface-hover hover:text-ink transition-all shadow-sm cursor-pointer text-sm"
                        >
                           <CheckSquare className="w-4 h-4" /> Bulk Actions <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                         {showBulkMenu && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border-hiyori shadow-xl rounded-2xl z-20 overflow-hidden py-1">
                               <button
                                  onClick={() => enterBulkMode('edit')}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-ink font-medium hover:bg-surface-hover transition-colors text-sm cursor-pointer"
                               >
                                  <Edit2 className="w-4 h-4 text-ink-muted" /> Bulk Edit
                               </button>
                               <button
                                  onClick={() => enterBulkMode('delete')}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-destructive font-medium hover:bg-destructive-surface transition-colors text-sm cursor-pointer"
                               >
                                  <Trash2 className="w-4 h-4" /> Bulk Delete
                               </button>
                            </div>
                          )}
                      </div>
                      )}
                </div>
            </div>

              {/* Bulk mode action bar */}
             {isBulkMode && (
                <div className="flex items-center justify-between gap-4 mb-4 px-1">
                   {bulkAction === 'edit' ? (
                      <span className="text-sm text-ink-muted font-medium">Editing {editingWordIds.size} card{editingWordIds.size !== 1 ? 's' : ''}</span>
                   ) : (
                      <span className="text-sm text-ink-muted font-medium">{selectedCardIds.size} of {filteredWords.length} selected</span>
                   )}
                   <div className="flex items-center gap-3">
                      {bulkAction === 'edit' && (
                         <button onClick={handleBulkSaveAll} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success text-white font-bold hover:bg-success-hover transition-all shadow-sm cursor-pointer text-sm">
                            <Save className="w-4 h-4" /> Save All Changes
                         </button>
                      )}
                      {bulkAction === 'delete' && (
                         <button
                            onClick={handleBulkDeleteConfirm}
                            disabled={selectedCardIds.size === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-white font-bold hover:bg-destructive-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer text-sm"
                         >
                            <Trash2 className="w-4 h-4" /> Delete Selected
                         </button>
                      )}
                      <button
                         onClick={exitBulkMode}
                         className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border-hiyori bg-surface text-ink-muted font-medium hover:bg-surface-hover hover:text-ink transition-all shadow-sm cursor-pointer text-sm"
                      >
                         <X className="w-4 h-4" /> Cancel
                      </button>
                   </div>
                </div>
             )}

             <div className="bg-surface border border-border-hiyori rounded-3xl shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                  <div role="table" style={{ minWidth: showBulkCheckboxColumn ? 640 : 600 }}>
                     <div role="row" className="grid border-b border-border-hiyori bg-page" style={{ gridTemplateColumns: wordTableColumns }}>
                        {showBulkCheckboxColumn && (
                           <div role="columnheader" className="px-4 py-4 flex items-center">
                              <input
                                 type="checkbox"
                                 checked={selectedCardIds.size === filteredWords.length && filteredWords.length > 0}
                                 onChange={toggleSelectAll}
                                 className="w-4 h-4 rounded border-border-hiyori text-brand focus:ring-brand cursor-pointer"
                              />
                           </div>
                        )}
                        <div role="columnheader" className="px-6 py-4 font-bold text-ink-muted text-sm uppercase tracking-wider">Kanji / Vocab</div>
                        <div role="columnheader" className="px-6 py-4 font-bold text-ink-muted text-sm uppercase tracking-wider">Kana</div>
                        <div role="columnheader" className="px-6 py-4 font-bold text-ink-muted text-sm uppercase tracking-wider">Meaning</div>
                        <div role="columnheader" className="px-6 py-4 text-right font-bold text-ink-muted text-sm uppercase tracking-wider">Actions</div>
                     </div>

                     {!isBulkMode && isAddingWord && (
                        <div role="row" className="grid bg-page border-b border-border-hiyori" style={{ gridTemplateColumns: wordTableColumns }}>
                           <div role="cell" className="px-6 py-3 flex items-center">
                              <input
                                 type="text" value={editWordKanji} onChange={e => setEditWordKanji(e.target.value)}
                                 placeholder="Kanji or word"
                                 className="w-full bg-surface border border-border-hiyori rounded-lg px-3 py-2 text-ink font-bold focus:outline-none focus:border-brand"
                                 autoFocus
                              />
                           </div>
                           <div role="cell" className="px-6 py-3 flex items-center">
                              <div className="space-y-2 w-full">
                                 <input
                                    type="text" value={editWordKana} onChange={e => setEditWordKana(e.target.value)}
                                    placeholder="Kana"
                                    className="w-full bg-surface border border-border-hiyori rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-brand"
                                 />
                                 <input
                                    type="text" value={editWordRomaji} onChange={e => setEditWordRomaji(e.target.value)}
                                    placeholder="Romaji"
                                    className="w-full bg-surface border border-border-hiyori rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-brand"
                                 />
                              </div>
                           </div>
                           <div role="cell" className="px-6 py-3 flex items-center">
                              <input
                                 type="text" value={editWordMeaning} onChange={e => setEditWordMeaning(e.target.value)}
                                 placeholder="Meaning"
                                 className="w-full bg-surface border border-border-hiyori rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-brand"
                              />
                           </div>
                           <div role="cell" className="px-6 py-3 flex items-center justify-end">
                              <div className="flex items-center justify-end gap-2">
                                 <button onClick={handleSaveWord} aria-label="Save word" className="p-2 bg-success/10 text-success hover:bg-success/20 rounded-lg transition-colors cursor-pointer">
                                    <Save className="w-4 h-4" />
                                 </button>
                                 <button onClick={resetWordForm} aria-label="Cancel" className="p-2 bg-surface-hover text-ink-muted hover:bg-border-hiyori rounded-lg transition-colors cursor-pointer">
                                    <X className="w-4 h-4" />
                                 </button>
                              </div>
                           </div>
                        </div>
                     )}

                     {filteredWords.length === 0 ? (
                        <div className="p-12 text-center">
                           <p className="text-ink-muted font-medium text-lg">No words found in this deck matching your search.</p>
                        </div>
                     ) : (
                        <div ref={tableScrollRef} className="max-h-[32rem] overflow-y-auto">
                           <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative", width: "100%" }}>
                              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                 const word = filteredWords[virtualRow.index];

                                 return (
                                    <div
                                       key={word.id}
                                       data-index={virtualRow.index}
                                       ref={rowVirtualizer.measureElement}
                                       role="row"
                                       style={{
                                          position: "absolute",
                                          top: 0,
                                          left: 0,
                                          width: "100%",
                                          transform: `translateY(${virtualRow.start}px)`,
                                          gridTemplateColumns: wordTableColumns,
                                       }}
                                       className={cn(
                                          "grid border-b border-border-hiyori transition-colors group",
                                          (isBulkMode && bulkAction === 'delete' && selectedCardIds.has(word.id)) ? "bg-brand/5" : "hover:bg-page"
                                       )}
                                    >
                                       {isBulkMode && bulkAction === 'delete' && (
                                          <div role="cell" className="px-4 py-4 flex items-center">
                                             <input
                                                type="checkbox"
                                                checked={selectedCardIds.has(word.id)}
                                                onChange={() => toggleSelectCard(word.id)}
                                                className="w-4 h-4 rounded border-border-hiyori text-brand focus:ring-brand cursor-pointer"
                                             />
                                          </div>
                                       )}
                                       {editingWordId === word.id ? (
                                          <>
                                             <div role="cell" className="px-6 py-3 flex items-center">
                                                <input
                                                   type="text" value={editWordKanji} onChange={e => setEditWordKanji(e.target.value)}
                                                   className="w-full bg-surface border border-border-hiyori rounded-lg px-3 py-2 text-ink font-bold focus:outline-none focus:border-brand"
                                                />
                                             </div>
                                             <div role="cell" className="px-6 py-3 flex items-center">
                                                <div className="space-y-2 w-full">
                                                   <input
                                                      type="text" value={editWordKana} onChange={e => setEditWordKana(e.target.value)}
                                                      className="w-full bg-surface border border-border-hiyori rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-brand"
                                                   />
                                                   <input
                                                      type="text" value={editWordRomaji} onChange={e => setEditWordRomaji(e.target.value)}
                                                      className="w-full bg-surface border border-border-hiyori rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-brand"
                                                   />
                                                </div>
                                             </div>
                                             <div role="cell" className="px-6 py-3 flex items-center">
                                                <input
                                                   type="text" value={editWordMeaning} onChange={e => setEditWordMeaning(e.target.value)}
                                                   className="w-full bg-surface border border-border-hiyori rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-brand"
                                                />
                                             </div>
                                             <div role="cell" className="px-6 py-3 flex items-center justify-end">
                                                <div className="flex items-center justify-end gap-2">
                                                   <button onClick={handleSaveWord} className="p-2 bg-success/10 text-success hover:bg-success/20 rounded-lg transition-colors cursor-pointer">
                                                      <Save className="w-4 h-4" />
                                                   </button>
                                                   <button onClick={resetWordForm} className="p-2 bg-surface-hover text-ink-muted hover:bg-border-hiyori rounded-lg transition-colors cursor-pointer">
                                                      <X className="w-4 h-4" />
                                                   </button>
                                                </div>
                                             </div>
                                          </>
                                       ) : editingWordIds.has(word.id) ? (
                                          <>
                                             <div role="cell" className="px-6 py-3 flex items-center">
                                                <input
                                                   type="text"
                                                   value={bulkEditValues[word.id]?.kanji ?? word.kanji}
                                                   onChange={e => updateBulkEditValue(word.id, 'kanji', e.target.value)}
                                                   className="w-full bg-surface border border-border-hiyori rounded-lg px-3 py-2 text-ink font-bold focus:outline-none focus:border-brand"
                                                />
                                             </div>
                                             <div role="cell" className="px-6 py-3 flex items-center">
                                                <div className="space-y-2 w-full">
                                                   <input
                                                      type="text"
                                                      value={bulkEditValues[word.id]?.kana ?? word.kana}
                                                      onChange={e => updateBulkEditValue(word.id, 'kana', e.target.value)}
                                                      className="w-full bg-surface border border-border-hiyori rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-brand"
                                                   />
                                                   <input
                                                      type="text"
                                                      value={bulkEditValues[word.id]?.romaji ?? word.romaji}
                                                      onChange={e => updateBulkEditValue(word.id, 'romaji', e.target.value)}
                                                      className="w-full bg-surface border border-border-hiyori rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-brand"
                                                   />
                                                </div>
                                             </div>
                                             <div role="cell" className="px-6 py-3 flex items-center">
                                                <input
                                                   type="text"
                                                   value={bulkEditValues[word.id]?.meaning ?? word.meaning}
                                                   onChange={e => updateBulkEditValue(word.id, 'meaning', e.target.value)}
                                                   className="w-full bg-surface border border-border-hiyori rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-brand"
                                                />
                                             </div>
                                             <div role="cell" className="px-6 py-3" />
                                          </>
                                       ) : (
                                          <>
                                             <div role="cell" className="px-6 py-4 flex items-center">
                                                <span className="text-2xl font-black text-ink">{word.kanji}</span>
                                             </div>
                                             <div role="cell" className="px-6 py-4 flex flex-col justify-center">
                                                <span className="text-ink-muted font-medium">{word.kana}</span>
                                                <div className="text-xs text-ink-faint mt-1">{word.romaji}</div>
                                             </div>
                                             <div role="cell" className="px-6 py-4 flex items-center">
                                                <span className="text-ink font-medium">{word.meaning}</span>
                                             </div>
                                             <div role="cell" className="px-6 py-4 flex items-center justify-end">
                                                {!isBulkMode && (
                                                <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                       onClick={() => handleEditWord(word)}
                                                      aria-label={`Edit ${word.kanji || word.kana || "word"}`}
                                                      className="p-2 text-ink-muted hover:text-ink hover:bg-surface rounded-xl shadow-sm border border-transparent hover:border-border-hiyori transition-all cursor-pointer"
                                                   >
                                                      <Edit2 className="w-4 h-4" />
                                                   </button>
                                                   <button
                                                      onClick={() => setDeleteConfirm(word)}
                                                      aria-label={`Delete ${word.kanji || word.kana || "word"}`}
                                                      className="p-2 text-ink-muted hover:text-destructive hover:bg-destructive-surface rounded-xl shadow-sm border border-transparent hover:border-destructive-surface-border transition-all cursor-pointer"
                                                   >
                                                      <Trash2 className="w-4 h-4" />
                                                   </button>
                                                </div>
                                                )}
                                             </div>
                                          </>
                                       )}
                                    </div>
                                 );
                              })}
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </motion.div>

         {/* Danger Zone */}
         <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mt-16 pt-8 border-t border-border-hiyori"
         >
            <div className="bg-destructive-surface border border-destructive-surface-border rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
               <div>
                  <h3 className="text-xl font-bold text-destructive-strong mb-2 flex items-center gap-2">
                     <Trash2 className="w-5 h-5" /> Danger Zone
                  </h3>
                  <p className="text-destructive-hover/80">Once you delete a deck, there is no going back. All learning progress and words associated with this deck will be permanently lost.</p>
               </div>
               <button
                  onClick={handleDeleteDeck}
                  className="shrink-0 px-6 py-3 bg-surface border-2 border-destructive-surface-border text-destructive-hover font-bold rounded-xl hover:bg-destructive-hover hover:text-white hover:border-destructive-hover transition-colors shadow-sm cursor-pointer"
               >
                  Delete this Deck
               </button>
            </div>
         </motion.div>
      </div>

      {/* Duplicate Warning Modal - portal to body */}
      {duplicateWarning && createPortal(
         <Modal onClose={() => setDuplicateWarning(null)} titleId="duplicate-warning-title" className="max-w-md w-full p-8">
               {duplicateWarning.exactMatches.length > 0 ? (
                  <>
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-surface-hover flex items-center justify-center">
                           <X className="w-5 h-5 text-ink-muted" />
                        </div>
                        <h3 id="duplicate-warning-title" className="text-xl font-bold text-ink">Card already exists</h3>
                     </div>
                     <p className="text-ink-muted mb-6">This exact card is already in the deck and won't be added again.</p>
                     <div className="bg-page rounded-2xl border border-border-hiyori p-4 mb-6 space-y-1">
                        <p className="text-2xl font-black text-ink">{duplicateWarning.exactMatches[0].kanji}</p>
                        <p className="text-ink-muted font-medium">{duplicateWarning.exactMatches[0].kana} · <span className="text-xs text-ink-faint">{duplicateWarning.exactMatches[0].romaji}</span></p>
                        <p className="text-ink">{duplicateWarning.exactMatches[0].meaning}</p>
                     </div>
                     <button
                        onClick={() => setDuplicateWarning(null)}
                        className="w-full px-6 py-3 bg-surface-hover text-ink font-bold rounded-xl hover:bg-border-hiyori transition-colors cursor-pointer"
                     >
                        Got it
                     </button>
                  </>
               ) : (
                  <>
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center">
                           <Edit2 className="w-5 h-5 text-brand" />
                        </div>
                        <h3 id="duplicate-warning-title" className="text-xl font-bold text-ink">Similar card exists</h3>
                     </div>
                     <p className="text-ink-muted mb-4">A card with the same kanji and kana already exists but with a different meaning:</p>
                     <div className="bg-page rounded-2xl border border-border-hiyori p-4 mb-2 space-y-1">
                        <p className="text-xs font-bold text-ink-faint uppercase tracking-wider mb-2">Existing card</p>
                        <p className="text-2xl font-black text-ink">{duplicateWarning.similarMatches[0].kanji}</p>
                        <p className="text-ink-muted font-medium">{duplicateWarning.similarMatches[0].kana} · <span className="text-xs text-ink-faint">{duplicateWarning.similarMatches[0].romaji}</span></p>
                        <p className="text-ink">{duplicateWarning.similarMatches[0].meaning}</p>
                     </div>
                     <div className="bg-brand/5 rounded-2xl border border-brand/20 p-4 mb-6 space-y-1">
                        <p className="text-xs font-bold text-brand uppercase tracking-wider mb-2">New card</p>
                        <p className="text-2xl font-black text-ink">{duplicateWarning.newCard.kanji}</p>
                        <p className="text-ink-muted font-medium">{duplicateWarning.newCard.kana} · <span className="text-xs text-ink-faint">{duplicateWarning.newCard.romaji}</span></p>
                        <p className="text-ink">{duplicateWarning.newCard.meaning}</p>
                     </div>
                     <div className="flex gap-3">
                        <button
                           onClick={() => setDuplicateWarning(null)}
                           className="flex-1 px-6 py-3 bg-surface-hover text-ink font-bold rounded-xl hover:bg-border-hiyori transition-colors cursor-pointer"
                        >
                           Cancel
                        </button>
                        <button
                           onClick={() => commitSaveWord(duplicateWarning.newCard)}
                           className="flex-1 px-6 py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-hover transition-colors cursor-pointer"
                        >
                           Add anyway
                        </button>
                     </div>
                  </>
               )}
         </Modal>,
         document.body
      )}

      {/* Delete Confirm Modal - portal to body */}
      {deleteConfirm && createPortal(
         <Modal onClose={() => setDeleteConfirm(null)} titleId="delete-card-title" className="max-w-sm w-full p-8">
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-2xl bg-destructive-surface flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-destructive" />
                 </div>
                 <h3 id="delete-card-title" className="text-xl font-bold text-ink">Remove card?</h3>
              </div>
              <div className="bg-page rounded-2xl border border-border-hiyori p-4 mb-6 space-y-1">
                 <p className="text-2xl font-black text-ink">{deleteConfirm.kanji}</p>
                 <p className="text-ink-muted font-medium">{deleteConfirm.kana} · <span className="text-xs text-ink-faint">{deleteConfirm.romaji}</span></p>
                 <p className="text-ink">{deleteConfirm.meaning}</p>
              </div>
              <div className="flex gap-3">
                 <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-6 py-3 bg-surface-hover text-ink font-bold rounded-xl hover:bg-border-hiyori transition-colors cursor-pointer"
                 >
                    Cancel
                 </button>
                 <button
                    onClick={handleDeleteWord}
                    className="flex-1 px-6 py-3 bg-destructive text-white font-bold rounded-xl hover:bg-destructive-hover transition-colors cursor-pointer"
                 >
                    Remove
                 </button>
              </div>
         </Modal>,
         document.body
      )}

      {/* Bulk Delete Confirm Modal - portal to body */}
      {bulkDeleteConfirm && createPortal(
         <Modal onClose={() => setBulkDeleteConfirm(null)} titleId="bulk-delete-title" className="max-w-sm w-full p-8">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-destructive-surface flex items-center justify-center">
                     <Trash2 className="w-5 h-5 text-destructive" />
                  </div>
                  <h3 id="bulk-delete-title" className="text-xl font-bold text-ink">Remove {bulkDeleteConfirm.length} card{bulkDeleteConfirm.length !== 1 ? 's' : ''}?</h3>
               </div>
               <p className="text-ink-muted mb-6">Are you sure you want to remove the {bulkDeleteConfirm.length} selected card{bulkDeleteConfirm.length !== 1 ? 's' : ''}? This cannot be undone.</p>
               <div className="flex gap-3">
                  <button
                     onClick={() => setBulkDeleteConfirm(null)}
                     className="flex-1 px-6 py-3 bg-surface-hover text-ink font-bold rounded-xl hover:bg-border-hiyori transition-colors cursor-pointer"
                  >
                     Cancel
                  </button>
                  <button
                     onClick={handleBulkDelete}
                     className="flex-1 px-6 py-3 bg-destructive text-white font-bold rounded-xl hover:bg-destructive-hover transition-colors cursor-pointer"
                  >
                     Remove
                  </button>
               </div>
         </Modal>,
         document.body
      )}

      {/* Export Toast */}
      {showToast && createPortal(
         <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-success text-white rounded-2xl shadow-lg border border-success-hover">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="font-bold text-sm">Deck exported successfully!</span>
         </div>,
         document.body
      )}
   </>
    );
}