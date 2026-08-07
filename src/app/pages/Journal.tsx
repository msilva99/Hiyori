import { useState, useRef, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import { createPortal } from "react-dom";
import type { JournalEntry, JournalSlot } from "../data/types";
import { useDecksStore } from "../store/decksStore";
import { useJournalStore } from "../store/journalStore";
import { Modal } from "../components/Modal";
import {
   buildVocabularyIndex,
   parseJournalText,
   type ParsedToken,
} from "../data/journalHighlighting";
import { 
   ChevronLeft, 
   ChevronRight, 
   PenTool, 
   Save,
   X,
   Plus,
   Coffee,
   Sun,
   Moon,
   CloudRain,
   Heart,
   Smile,
   Frown,

    CalendarDays,
    Trash2,
    AlertTriangle
} from "lucide-react";
import { format, subDays, addDays, isToday, parseISO } from "date-fns";
import { cn } from "../../lib/utils";

// Mock known words from decks to highlight. Later this should come from real deck storage.
// const deckWords = ['私', '猫', '食べる', 'ありがとう', 'おはよう', '今日', '美味しい', 'watashi', 'neko', 'taberu'];


// const today = new Date();
// const nowIso = new Date().toISOString();

// const mockEntries: JournalEntry[] = [
// {
//    id: "1",
//    date: format(today, "yyyy-MM-dd"), // Today
//    title: "A good morning!",
//    body: "今日 はとてもいい天気でした。朝ご飯に美味しいパンを食べる。\n\nThen I went for a walk and saw a 猫. It was very cute. 私 はとても嬉しかったです。ありがとう for the good day.",
//    slots: [
//    { id: "s1", icon: "Sun", text: "Sunny" },
//    { id: "s2", icon: "Smile", text: "Happy" },
//    { id: "s3", icon: "Coffee", text: "Matcha Latte" },
//    ],
//    createdAt: nowIso,
//    updatedAt: nowIso,
// },
// {
//    id: "2",
//    date: format(subDays(today, 1), "yyyy-MM-dd"), // Yesterday
//    title: "Tired day",
//    body: "昨日はとても疲れました。でも、新しい単語をたくさん勉強しました。",
//    slots: [
//    { id: "s1", icon: "CloudRain", text: "Rainy" },
//    { id: "s2", icon: "Frown", text: "Tired" },
//    ],
//    createdAt: nowIso,
//    updatedAt: nowIso,
// },
// {
//    id: "3",
//    date: format(subDays(today, 3), "yyyy-MM-dd"), // 3 Days Ago
//    title: "Sakura blossoms",
//    body: "公園で桜を見ました。とても綺麗でした。watashi likes spring and hot tea.",
//    slots: [
//    { id: "s1", icon: "Sun", text: "Warm" },
//    { id: "s2", icon: "Heart", text: "Lovely" },
//    ],
//    createdAt: nowIso,
//    updatedAt: nowIso,
// }
// ];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(2000, i, 1), "MMMM") }));

const availableIcons = {
   Sun: <Sun className="w-5 h-5" />,
   Moon: <Moon className="w-5 h-5" />,
   CloudRain: <CloudRain className="w-5 h-5" />,
   Heart: <Heart className="w-5 h-5" />,
   Smile: <Smile className="w-5 h-5" />,
   Frown: <Frown className="w-5 h-5" />,
   Coffee: <Coffee className="w-5 h-5" />,
};

type IconName = keyof typeof availableIcons;

export function Journal() {

   
   const entries = useJournalStore((state) => state.journalEntries);
    const saveJournalEntry = useJournalStore((state) => state.saveJournalEntry);
    const deleteJournalEntry = useJournalStore((state) => state.deleteJournalEntry);
   const decks = useDecksStore((state) => state.decks);
   
   // The journal is date-driven: currentDate chooses which entry is shown or edited.
   const [currentDate, setCurrentDate] = useState(new Date());

   const [mode, setMode] = useState<'view' | 'edit'>('view');
   const [showHistory, setShowHistory] = useState(false);
   const [historyMonthFilter, setHistoryMonthFilter] = useState<'all' | number>('all');
   const [historyYearFilter, setHistoryYearFilter] = useState<'all' | number>('all');
   const historyRef = useRef<HTMLDivElement>(null);

   // Closing the history popover on an outside click/Escape via document listeners
   // (rather than a full-viewport overlay element) - no extra DOM node, so nothing
   // for a screen reader to navigate around and nothing extra to paint/hit-test.
   useEffect(() => {
      if (!showHistory) {
         return;
      }

      const handlePointerDown = (event: MouseEvent) => {
         if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
            setShowHistory(false);
         }
      };

      const handleKeyDown = (event: KeyboardEvent) => {
         if (event.key === "Escape") {
            setShowHistory(false);
         }
      };

      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);

      return () => {
         document.removeEventListener("mousedown", handlePointerDown);
         document.removeEventListener("keydown", handleKeyDown);
      };
   }, [showHistory]);

   // Edit State
   const [editTitle, setEditTitle] = useState("");
   const [editBody, setEditBody] = useState("");
   const [editSlots, setEditSlots] = useState<JournalSlot[]>([]);
   
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const [showIconPickerFor, setShowIconPickerFor] = useState<string | null>(null);
    // Snapshot of the fields when editing started, so Cancel can tell whether anything actually changed.
    const initialEditStateRef = useRef({ title: "", body: "", slots: [] as JournalSlot[] });

   // Derived value: the entry for whichever day the user is currently viewing.
   const currentDateKey = format(currentDate, "yyyy-MM-dd");
   const currentEntry = entries.find(e => e.date === currentDateKey);

   // Switching days mid-edit shouldn't force a choice - autosave whatever's
   // there (or just exit edit mode if there's nothing worth keeping) and move on.
   const commitDraftBeforeLeaving = () => {
      if (mode !== 'edit') {
         return;
      }

      const hasContent = editTitle.trim() || editBody.trim() || editSlots.some(slot => slot.text.trim());

      if (hasContent && hasUnsavedEditChanges()) {
         handleSave();
      } else {
         setMode('view');
      }
   };

   const handlePrevDay = () => {
      commitDraftBeforeLeaving();
      setCurrentDate(subDays(currentDate, 1));
   };

   const handleNextDay = () => {
      commitDraftBeforeLeaving();
      setCurrentDate(addDays(currentDate, 1));
   };


   const vocabulary = useMemo(() => {
      return buildVocabularyIndex(decks);
   }, [decks]);

   const parsedTokens = useMemo(() => {
      if (!currentEntry) return [];

      return parseJournalText(currentEntry.body, vocabulary);
   }, [currentEntry, vocabulary]);

   const knownWordCount = useMemo(() => {
      return new Set(
         parsedTokens.filter((token) => token.type === "highlight").map((token) => token.content)
      ).size;
   }, [parsedTokens]);

   const availableHistoryYears = useMemo(() => {
      const years = new Set(entries.map(entry => parseISO(entry.date).getFullYear()));
      return Array.from(years).sort((a, b) => b - a);
   }, [entries]);

   const filteredHistoryEntries = useMemo(() => {
      return [...entries]
         .filter(entry => {
            const entryDate = parseISO(entry.date);
            if (historyYearFilter !== 'all' && entryDate.getFullYear() !== historyYearFilter) return false;
            if (historyMonthFilter !== 'all' && entryDate.getMonth() !== historyMonthFilter) return false;
            return true;
         })
         .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
   }, [entries, historyYearFilter, historyMonthFilter]);



   
   const startWriting = () => {
      // Editing an existing entry copies it into controlled form fields.
      // A new date starts with empty fields.
      if (currentEntry) {
         setEditTitle(currentEntry.title);
         setEditBody(currentEntry.body);
         setEditSlots([...currentEntry.slots]);
         initialEditStateRef.current = { title: currentEntry.title, body: currentEntry.body, slots: [...currentEntry.slots] };
      } else {
         setEditTitle("");
         setEditBody("");
         setEditSlots([]);
         initialEditStateRef.current = { title: "", body: "", slots: [] };
      }
      setMode('edit');
   };

   const hasUnsavedEditChanges = () => {
      const baseline = initialEditStateRef.current;
      return (
         editTitle !== baseline.title ||
         editBody !== baseline.body ||
         JSON.stringify(editSlots) !== JSON.stringify(baseline.slots)
      );
   };

   const handleCancelEdit = () => {
      if (hasUnsavedEditChanges()) {
         setShowDiscardConfirm(true);
         return;
      }
      setMode('view');
   };

   const confirmDiscardEdit = () => {
      setShowDiscardConfirm(false);
      setMode('view');
   };
   
    const handleSave = () => {
       // Save replaces the current day's entry or creates a new one for that date.
       const savedAt = new Date().toISOString();
       const newEntry: JournalEntry = {
          id: currentEntry ? currentEntry.id : Date.now().toString(),
          date: currentDateKey,
          title: editTitle || "Untitled Entry",
          body: editBody,
          slots: editSlots,
          createdAt: currentEntry ? currentEntry.createdAt : savedAt,
          updatedAt: savedAt,
       };

       
       saveJournalEntry(newEntry);
       setMode('view');
    };

    const handleDelete = () => {
       if (!currentEntry) return;
       setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
       if (!currentEntry) return;
       deleteJournalEntry(currentEntry.id);
       setShowDeleteConfirm(false);
       setMode('view');
    };
   
   const addSlot = () => {
      // Slots are short metadata chips for the entry, capped at three to keep the page calm.
      if (editSlots.length >= 3) return;
      setEditSlots([...editSlots, { id: Date.now().toString(), icon: "Smile", text: "" }]);
   };
   
   const updateSlotText = (id: string, text: string) => {
      setEditSlots(editSlots.map(s => s.id === id ? { ...s, text } : s));
   };
   
   const updateSlotIcon = (id: string, icon: string) => {
      setEditSlots(editSlots.map(s => s.id === id ? { ...s, icon } : s));
      setShowIconPickerFor(null);
   };
   
   const removeSlot = (id: string) => {
      setEditSlots(editSlots.filter(s => s.id !== id));
   };
   
   // Highlighting logic for known deck words inside journal text.
   // const renderHighlightedBody = (text: string) => {
   //    // Longest-first sorting prevents shorter words from splitting longer matches.
   //    const sortedWords = [...deckWords].sort((a, b) => b.length - a.length);
   //    const regex = new RegExp(`(${sortedWords.join('|')})`, 'gi');
      
   //    const parts = text.split(regex);
      
   //    return parts.map((part, i) => {
   //       const isMatch = sortedWords.some(w => w.toLowerCase() === part.toLowerCase());
   //       if (isMatch) {
   //          return (
   //          <span key={i} className="bg-brand/20 text-brand-hover font-bold px-1 rounded cursor-pointer hover:bg-brand/30 transition-colors relative group">
   //             {part}
   //             <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-ink text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
   //                In your deck
   //             </span>
   //          </span>
   //          );
   //       }
   //       return <span key={i}>{part}</span>;
   //    });
   // };
      
return (
    <>
       <div className="flex min-h-[calc(100vh-80px)] font-sans max-w-6xl mx-auto w-full gap-8 relative">
         
         {/* Main Content Area */}
          <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full transition-all duration-300">
            
             {/* Header Navigation */}
             <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between mb-8 shrink-0 relative z-40 gap-3">
                <div className="flex items-center justify-center sm:justify-start gap-4 w-full sm:w-auto">
                   <button
                      onClick={handlePrevDay}
                      aria-label="Previous day"
                      className="p-2 rounded-full hover:bg-surface-hover text-ink-muted hover:text-ink transition-colors shrink-0"
                   >
                      <ChevronLeft className="w-6 h-6" />
                   </button>
                
                   {/* Clickable Date with History Popover */}
                   <div className="relative" ref={historyRef}>
                      <button
                         onClick={() => setShowHistory(!showHistory)}
                         aria-expanded={showHistory}
                         aria-haspopup="true"
                         className="text-center min-w-40 group flex flex-col items-center justify-center px-4 py-2 rounded-2xl hover:bg-page transition-all hover:shadow-sm border border-transparent hover:border-border-hiyori"
                         >
                         <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-black text-ink capitalize tracking-tight group-hover:text-brand transition-colors">
                               {isToday(currentDate) ? "Today" : format(currentDate, "EEEE")}
                            </h2>
                            <CalendarDays className="w-5 h-5 text-ink-muted group-hover:text-brand transition-colors" />
                         </div>
                         <span className="text-ink-muted text-sm font-medium">{format(currentDate, "MMMM d, yyyy")}</span>
                      </button>

                      {/* Plain conditional render rather than AnimatePresence - its exit
                          animation reliably got stuck at opacity 0 without ever unmounting
                          in this file, so the popover would "close" visually but stay in
                          the DOM (and keep intercepting outside clicks). A fade-in on open
                          is enough; closing can just be instant. */}
                      {showHistory && (
                               <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[90vw] sm:w-[320px] bg-surface rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-border-hiyori flex flex-col max-h-100 overflow-hidden"
                               >
                                  <div className="p-4 border-b border-border-hiyori bg-page flex items-center justify-between shrink-0">
                                     <span className="font-bold text-ink">Entry History</span>
                                     <span className="text-xs font-bold bg-brand/10 text-brand px-2.5 py-1 rounded-md">{filteredHistoryEntries.length} entries</span>
                                  </div>
                                  {entries.length > 0 && (
                                     <div className="p-3 border-b border-border-hiyori bg-page flex items-center gap-2 shrink-0">
                                        <select
                                           value={historyMonthFilter}
                                           onChange={(e) => setHistoryMonthFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                           aria-label="Filter entries by month"
                                           className="flex-1 min-w-0 text-sm font-bold bg-surface border border-border-hiyori rounded-lg px-2 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
                                        >
                                           <option value="all">All months</option>
                                           {MONTH_OPTIONS.map(month => (
                                              <option key={month.value} value={month.value}>{month.label}</option>
                                           ))}
                                        </select>
                                        <select
                                           value={historyYearFilter}
                                           onChange={(e) => setHistoryYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                           aria-label="Filter entries by year"
                                           className="text-sm font-bold bg-surface border border-border-hiyori rounded-lg px-2 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
                                        >
                                           <option value="all">All years</option>
                                           {availableHistoryYears.map(year => (
                                              <option key={year} value={year}>{year}</option>
                                           ))}
                                        </select>
                                     </div>
                                  )}
                                  <div className="overflow-y-auto">
                                     {filteredHistoryEntries.length === 0 ? (
                                        <div className="p-8 text-center text-ink-muted text-sm font-medium">
                                           {entries.length === 0 ? "No past entries yet." : "No entries match this filter."}
                                        </div>
                                        ) : (
                                        filteredHistoryEntries.map(entry => {
                                           const isActive = entry.date === currentDateKey;
                                           return (
                                           <button
                                              key={entry.id}
                                              onClick={() => {
                                                 commitDraftBeforeLeaving();
                                                 setCurrentDate(parseISO(entry.date));
                                                 setShowHistory(false);
                                           }}
                                           className={cn(
                                              "w-full text-left p-4 border-b border-border-hiyori last:border-0 transition-colors flex flex-col gap-2 group",
                                              isActive ? "bg-surface-hover" : "hover:bg-page"
                                              )}
                                              >
                                              <div className="flex justify-between items-start gap-2">
                                                 <span className={cn(
                                                 "font-bold truncate flex-1 transition-colors", 
                                                 isActive ? "text-brand" : "text-ink group-hover:text-brand"
                                                 )}>
                                                 {entry.title || "Untitled"}
                                              </span>
                                              <span className={cn(
                                              "text-xs font-bold whitespace-nowrap px-2 py-0.5 rounded-full transition-colors",
                                              isActive ? "bg-brand text-white" : "bg-border-hiyori text-ink-muted"
                                              )}>
                                              {format(parseISO(entry.date), "MMM d")}
                                           </span>
                                        </div>
                                           <p className="text-sm text-ink-muted line-clamp-2 leading-relaxed">
                                              {entry.body || <span className="italic opacity-50">No content</span>}
                                           </p>
                                        </button>
                                        );
                                        })
                                     )}
                                  </div>
                               </motion.div>
                      )}
                   </div>

                    <button
                       onClick={handleNextDay}
                       disabled={isToday(currentDate)}
                       aria-label="Next day"
                       className="p-2 rounded-full hover:bg-surface-hover text-ink-muted hover:text-ink transition-colors disabled:opacity-30 disabled:hover:bg-transparent shrink-0"
                    >
                       <ChevronRight className="w-6 h-6" />
                    </button>
                 </div>
           
                  <div className="flex items-center gap-3">
                    {mode === 'view' ? (
                       <button 
                          onClick={startWriting}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-success text-white font-bold hover:bg-success-hover transition-all shadow-sm shadow-success/20"
                       >
                          <PenTool className="w-5 h-5" /> {currentEntry ? "Edit Entry" : "Write"}
                       </button>
                    ) : (
                       <>
                          {currentEntry && (
                             <button 
                                onClick={handleDelete}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface text-destructive font-bold border border-border-hiyori hover:bg-destructive-surface hover:border-destructive-surface-border transition-all"
                             >
                                Delete
                             </button>
                          )}
                          <button
                             onClick={handleCancelEdit}
                             className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface text-ink-muted font-bold border border-border-hiyori hover:bg-page hover:text-ink transition-all"
                          >
                             Cancel
                          </button>
                          <button 
                             onClick={handleSave}
                             disabled={!editTitle.trim() && !editBody.trim()}
                             className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-success text-white font-bold hover:bg-success-hover transition-all shadow-sm shadow-success/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-success"
                          >
                             <Save className="w-5 h-5" /> Save
                          </button>
                       </>
                    )}
                 </div>
             </div>

{/* Paper Container */}
<div className="flex-1 bg-surface border border-border-hiyori rounded-4xl shadow-sm relative  flex flex-col z-10">
   
    <div className="flex-1 p-4 md:p-10 relative z-10">
      {mode === 'view' ? (
      // Keyed on the date (not wrapped in AnimatePresence) so switching to a day
      // with no entry always gets a clean remount instead of relying on an exit
      // animation to swap content - AnimatePresence here left the outgoing view
      // stuck mid-transition and the new content never appeared.
      <motion.div
         key={currentDateKey}
         initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
         className={currentEntry ? "space-y-8" : "flex flex-col items-center justify-center h-full text-center space-y-6"}
      >
            {currentEntry ? (
               <>
                  <div>
                     <h1 className="text-4xl font-extrabold text-ink leading-tight mb-6">{currentEntry.title}</h1>

                     {currentEntry.slots.length > 0 && (
                        <div className="flex flex-wrap gap-3 mb-8">
                           {currentEntry.slots.map(slot => (
                              <div key={slot.id} className="flex items-center gap-2 px-4 py-2 bg-page border border-border-hiyori rounded-full text-ink-muted font-medium shadow-sm">
                                 <span className="text-brand">{availableIcons[slot.icon as IconName]}</span>
                                 <span>{slot.text}</span>
                              </div>
                              ))}
                           </div>
                           )}

                        {currentEntry.body.trim().length > 0 && (
                           <p className="text-xs font-bold text-ink-faint uppercase tracking-wider flex items-center gap-2 mb-8">
                              <span>{currentEntry.body.replace(/\s+/g, "").length} characters</span>
                              <span aria-hidden="true">·</span>
                              <span>{knownWordCount} known word{knownWordCount !== 1 ? "s" : ""} used</span>
                           </p>
                        )}
                  </div>

                  <div className="w-full h-px bg-border-hiyori" />

                  <div className="relative">
                     <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 36px, var(--ink) 36px, var(--ink) 37px, transparent 37px, transparent 40px)' }} />
                     <div className="text-lg text-ink leading-10 whitespace-pre-wrap font-medium">
                        {parsedTokens.map((token, i) => {
                           if (token.type === "text") {
                              return <span key={i}>{token.content}</span>;
                           }

                           return (
                              <HighlightedWord
                                 key={i}
                                 token={token}
                              />
                           );
                        })}
                     </div>
                  </div>
               </>
            ) : (
               <>
                  <div className="w-24 h-24 bg-surface-hover rounded-full flex items-center justify-center text-ink-faint">
                     <PenTool className="w-10 h-10" />
                  </div>
                  <div>
                     <h3 className="text-2xl font-bold text-ink">No entry yet</h3>
                     <p className="text-ink-muted mt-2 max-w-md">Write about your day in Japanese. Don't worry about making mistakes, just practice!</p>
                  </div>
                  <button
                     onClick={startWriting}
                     className="mt-4 px-8 py-4 rounded-xl bg-page border-2 border-border-hiyori text-ink font-bold hover:border-brand hover:text-brand transition-all shadow-sm"
                  >
                     Start Writing
                  </button>
               </>
            )}
      </motion.div>
      ) : (
      <motion.div 
      key="edit"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="space-y-6 h-full flex flex-col relative z-20"
      >
      <input
      type="text"
      value={editTitle}
      onChange={(e) => setEditTitle(e.target.value)}
      placeholder="Give your entry a title..."
      className="w-full text-4xl font-extrabold text-ink placeholder:text-ink-faint bg-transparent border-none focus:outline-none focus:ring-0 px-0"
      />
      
      <div className="flex flex-wrap items-center gap-3">
         {editSlots.map(slot => (
            <div key={slot.id} className="flex items-center gap-2 px-2 py-1.5 bg-page border border-border-hiyori rounded-xl relative group">
               <button
               onClick={() => setShowIconPickerFor(showIconPickerFor === slot.id ? null : slot.id)}
               aria-label="Choose icon for slot"
               className="p-1.5 hover:bg-surface-hover rounded-lg text-brand transition-colors"
               >
               {availableIcons[slot.icon as IconName]}
            </button>

            {/* Icon Picker Popover */}
            {showIconPickerFor === slot.id && (
               <>
               <div className="fixed inset-0" onClick={() => setShowIconPickerFor(null)} />
                  <div className="absolute top-full left-0 mt-2 bg-surface border border-border-hiyori shadow-xl rounded-2xl p-2 flex gap-1 z-30">
                     {Object.entries(availableIcons).map(([name, icon]) => (
                        <button
                        key={name}
                        onClick={() => updateSlotIcon(slot.id, name)}
                        aria-label={name}
                        className="p-2 hover:bg-page rounded-xl text-ink-muted hover:text-brand transition-colors"
                        >
                        {icon}
                     </button>
                     ))}
                  </div>
                  </>
                  )}
                  
                  <input
                  type="text"
                  value={slot.text}
                  onChange={(e) => updateSlotText(slot.id, e.target.value)}
                  placeholder="short text"
                  className="w-24 bg-transparent border-none text-ink text-sm font-medium focus:outline-none placeholder:text-ink-faint"
                  />
                  <button
                     onClick={() => removeSlot(slot.id)}
                     aria-label="Remove slot"
                     className="p-1 hover:bg-deck-cream text-ink-faint hover:text-destructive rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                     <X className="w-4 h-4" />
                  </button>
               </div>
               ))}
            
            {editSlots.length < 3 && (
               <button 
               onClick={addSlot}
               className="flex items-center gap-1 px-3 py-2 border border-dashed border-ink-faint text-ink-muted rounded-xl text-sm font-bold hover:border-brand hover:text-brand transition-colors"
               >
               <Plus className="w-4 h-4" /> Add Slot
            </button>
            )}
         </div>
         
          <div className="w-full h-px bg-border-hiyori" />
          
          <div className="flex-1 relative">
             <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 36px, var(--ink) 36px, var(--ink) 37px, transparent 37px, transparent 40px)' }} />
             <textarea
             value={editBody}
             onChange={(e) => setEditBody(e.target.value)}
             placeholder="Write your entry here... 何を食べましたか？"
             className="w-full h-full resize-none bg-transparent border-none text-lg text-ink leading-10 focus:outline-none placeholder:text-ink-faint font-medium"
             />
          </div>
      </motion.div>
      )}
   </div>
</div>
</div>


</div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && createPortal(
         <Modal onClose={() => setShowDeleteConfirm(false)} titleId="delete-entry-title" className="max-w-sm w-full p-8">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-destructive-surface flex items-center justify-center">
                     <Trash2 className="w-5 h-5 text-destructive" />
                  </div>
                  <h3 id="delete-entry-title" className="text-xl font-bold text-ink">Delete entry?</h3>
               </div>
               <p className="text-ink-muted mb-6">Are you sure you want to delete this entry? This cannot be undone.</p>
               <div className="flex gap-3">
                  <button
                     onClick={() => setShowDeleteConfirm(false)}
                     className="flex-1 px-6 py-3 bg-surface-hover text-ink font-bold rounded-xl hover:bg-border-hiyori transition-colors cursor-pointer"
                  >
                     Cancel
                  </button>
                  <button
                     onClick={confirmDelete}
                     className="flex-1 px-6 py-3 bg-destructive text-white font-bold rounded-xl hover:bg-destructive-hover transition-colors cursor-pointer"
                  >
                     Delete
                  </button>
               </div>
         </Modal>,
         document.body
      )}

      {/* Discard Unsaved Changes Modal */}
      {showDiscardConfirm && createPortal(
         <Modal
            onClose={() => setShowDiscardConfirm(false)}
            titleId="discard-changes-title"
            className="max-w-sm w-full p-8"
         >
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-destructive-surface flex items-center justify-center">
                     <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <h3 id="discard-changes-title" className="text-xl font-bold text-ink">Discard changes?</h3>
               </div>
               <p className="text-ink-muted mb-6">You have unsaved edits to this entry. Discarding will lose them for good.</p>
               <div className="flex gap-3">
                  <button
                     onClick={() => setShowDiscardConfirm(false)}
                     className="flex-1 px-6 py-3 bg-surface-hover text-ink font-bold rounded-xl hover:bg-border-hiyori transition-colors cursor-pointer"
                  >
                     Keep Editing
                  </button>
                  <button
                     onClick={confirmDiscardEdit}
                     className="flex-1 px-6 py-3 bg-destructive text-white font-bold rounded-xl hover:bg-destructive-hover transition-colors cursor-pointer"
                  >
                     Discard
                  </button>
               </div>
         </Modal>,
         document.body
      )}
    </>
);
}








type HighlightedWordProps = {
   token: Extract<ParsedToken, { type: "highlight" }>;
};

function HighlightedWord({
   token,
}: HighlightedWordProps) {
   const tooltipRef = useRef<HTMLDivElement>(null);
   const [align, setAlign] = useState<"center" | "left" | "right">("center");

   return (
      <span className="relative group inline">
         <span
            className="bg-brand/20 text-brand-hover font-bold px-1 rounded cursor-pointer hover:bg-brand/30 transition-colors"
            onMouseEnter={() => {
               if (!tooltipRef.current) return;
               const rect = tooltipRef.current.getBoundingClientRect();
               if (rect.left < 0) setAlign("left");
               else if (rect.right > window.innerWidth) setAlign("right");
               else setAlign("center");
            }}
         >
            {token.content}
         </span>

         <div
            ref={tooltipRef}
            className={cn(
               "absolute bottom-full mb-2 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50",
               align === "center" && "left-1/2 -translate-x-1/2",
               align === "left" && "left-0",
               align === "right" && "right-0",
            )}
         >
            <div className="bg-ink text-white rounded-xl shadow-xl p-3 min-w-60">

               <div className="space-y-2">
                  {token.matches.map((match, index) => (
                     <div
                        key={`${match.deckId}-${match.cardId}-${index}`}
                        className="border-t border-white/10 pt-2 first:border-0 first:pt-0"
                     >
                        <div className="text-sm font-semibold">
                           {match.kanji || match.kana}
                        </div>

                        {match.kana && (
                           <div className="text-xs text-white/70">
                              {match.kana}
                           </div>
                        )}

                        <div className="text-sm mt-1">
                           {match.meaning}
                        </div>

                        <div className="text-xs text-brand mt-1 font-semibold">
                           {match.deckTitle}
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </span>
   );
}
