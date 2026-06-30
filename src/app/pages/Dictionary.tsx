import { useState } from "react";
import { motion } from "motion/react";
import { 
   Search, 
   Volume2, 
   Plus, 
   Book, 
   Check, 
   X,
   PlusCircle
} from "lucide-react";
import { cn } from "../../lib/utils";

// Dictionary is currently outside active product scope. Keep this prototype isolated until it is re-enabled.
const mockDecks = [
   { id: 1, title: 'JLPT N5 Vocabulary', color: 'bg-deck-pine' },
   { id: 2, title: 'Essential Verbs', color: 'bg-deck-sand' },
   { id: 3, title: 'Anime Dialogue', color: 'bg-deck-sky' },
];

const mockResults = [
   { 
      id: 1, 
      kanji: "食べる", 
      kana: "たべる", 
      romaji: "taberu", 
      meanings: ["to eat"], 
      tags: ["Ichidan verb", "Transitive verb", "JLPT N5"] 
   },
   { 
      id: 2, 
      kanji: "今日", 
      kana: "きょう", 
      romaji: "kyou", 
      meanings: ["today", "this day"], 
      tags: ["Noun", "Temporal noun", "JLPT N5"] 
   },
   { 
      id: 3, 
      kanji: "美味しい", 
      kana: "おいしい", 
      romaji: "oishii", 
      meanings: ["delicious", "tasty"], 
      tags: ["I-adjective", "JLPT N5"] 
   },
];

export function Dictionary({ inline = false }: { inline?: boolean }) {
   // Local-only mock search state. No external dictionary API is connected yet.
   const [query, setQuery] = useState("");
   const [isSearching, setIsSearching] = useState(false);
   const [results, setResults] = useState<typeof mockResults>([]);
   
   // Quick Add State
   const [showDecksPopover, setShowDecksPopover] = useState<number | null>(null);
   const [addedDecks, setAddedDecks] = useState<Record<number, Set<number>>>({});
   
   const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim()) return;
      
      setIsSearching(true);
      // Simulate an API call so loading and result states can be designed before real data exists.
      setTimeout(() => {
         setResults(mockResults.filter(r => 
            r.kanji.includes(query) || 
            r.kana.includes(query) || 
            r.romaji.includes(query.toLowerCase()) ||
            r.meanings.some(m => m.toLowerCase().includes(query.toLowerCase()))
         ));
         setIsSearching(false);
      }, 600);
   };
   
   const toggleDeck = (wordId: number, deckId: number) => {
      setAddedDecks(prev => {
         const wordDecks = prev[wordId] ? new Set(prev[wordId]) : new Set<number>();
         if (wordDecks.has(deckId)) {
            wordDecks.delete(deckId);
         } else {
            wordDecks.add(deckId);
         }
         return { ...prev, [wordId]: wordDecks };
      });
   };
   
   const isWordInDeck = (wordId: number, deckId: number) => {
      return addedDecks[wordId]?.has(deckId);
   };
   
   return (
      <div className={cn("flex flex-col h-full", !inline && "space-y-8 font-sans max-w-3xl mx-auto w-full")}>
      {!inline && (
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
         <h1 className="text-4xl font-extrabold text-ink tracking-tight">Dictionary</h1>
         <p className="text-ink-muted mt-2 text-lg">Search for any Japanese word and add it to your decks.</p>
         </motion.div>
      )}
      
      <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      >
      <form onSubmit={handleSearch} className="relative">
      <input 
      type="text" 
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search by Kanji, Kana, Romaji, or English..." 
      className="w-full pl-6 pr-16 py-4 text-lg bg-surface border-2 border-border-hiyori rounded-2xl text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all shadow-sm"
      />
      <button 
      type="submit"
      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-brand text-white rounded-xl flex items-center justify-center hover:bg-brand-hover transition-colors"
      >
      <Search className="w-5 h-5" />
      </button>
      </form>
      </motion.div>
      
      {/* Results */}
      <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className={cn("flex-1", inline && "overflow-y-auto mt-6 pb-20")}
      >
      {isSearching ? (
         <div className="flex justify-center py-20">
         <div className="w-8 h-8 border-4 border-border-hiyori border-t-brand rounded-full animate-spin" />
         </div>
      ) : results.length > 0 ? (
         <div className="space-y-4">
         {results.map((word) => (
            <div 
            key={word.id} 
            className="bg-surface border border-border-hiyori rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative"
            >
            <div className="flex items-start justify-between gap-4">
            <div>
            <div className="flex items-baseline gap-3 mb-1">
            <h2 className="text-3xl font-black text-ink">{word.kanji}</h2>
            <span className="text-lg text-ink-muted font-medium">{word.kana}</span>
            <button className="text-ink-faint hover:text-brand transition-colors p-1">
            <Volume2 className="w-5 h-5" />
            </button>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
            {word.tags.map(tag => (
               <span key={tag} className="text-xs font-bold px-2 py-1 bg-surface-hover text-ink-muted rounded-md uppercase tracking-wider">
               {tag}
               </span>
            ))}
            </div>
            
            <div className="space-y-2">
            <div className="flex gap-4">
            <span className="text-ink-faint font-bold">1</span>
            <p className="text-ink text-lg font-medium">{word.meanings.join(", ")}</p>
            </div>
            </div>
            </div>
            
            <div className="relative">
            <button 
            onClick={() => setShowDecksPopover(showDecksPopover === word.id ? null : word.id)}
            className="flex items-center gap-2 px-4 py-2 bg-page border border-border-hiyori hover:bg-surface-hover rounded-xl text-ink font-medium transition-colors whitespace-nowrap"
            >
            <PlusCircle className="w-5 h-5 text-brand" /> Add to Deck
            </button>
            
            {/* Quick Add Popover */}
            {showDecksPopover === word.id && (
               <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border-hiyori shadow-xl rounded-2xl z-20 overflow-hidden">
               <div className="p-3 border-b border-border-hiyori flex justify-between items-center bg-page">
               <span className="font-bold text-ink text-sm">Save to...</span>
               <button onClick={() => setShowDecksPopover(null)} className="text-ink-muted hover:text-ink">
               <X className="w-4 h-4" />
               </button>
               </div>
               <div className="p-2 max-h-60 overflow-y-auto">
               {mockDecks.map(deck => {
                  const isAdded = isWordInDeck(word.id, deck.id);
                  return (
                     <button
                     key={deck.id}
                     onClick={() => toggleDeck(word.id, deck.id)}
                     className="w-full flex items-center gap-3 p-2 hover:bg-page rounded-xl transition-colors text-left group"
                     >
                     <div className={cn(
                        "w-6 h-6 rounded flex items-center justify-center shrink-0 transition-colors border",
                        isAdded 
                        ? "bg-brand border-brand text-white" 
                        : "bg-surface border-ink-faint text-transparent group-hover:border-brand"
                     )}>
                     <Check className="w-4 h-4" strokeWidth={3} />
                     </div>
                     <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0", deck.color, "bg-opacity-20")}>
                     <Book className={cn("w-3 h-3", deck.color.replace('bg-', 'text-'))} />
                     </div>
                     <span className="font-medium text-ink truncate flex-1">{deck.title}</span>
                     </button>
                  );
               })}
               </div>
               <div className="p-2 border-t border-border-hiyori">
               <button className="w-full flex items-center justify-center gap-2 py-2 text-brand hover:bg-page rounded-xl font-medium transition-colors text-sm">
               <Plus className="w-4 h-4" /> Create new deck
               </button>
               </div>
               </div>
            )}
            </div>
            </div>
            </div>
         ))}
         </div>
      ) : query && !isSearching ? (
         <div className="text-center py-20">
         <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
         <Search className="w-8 h-8 text-ink-faint" />
         </div>
         <p className="text-ink-muted text-lg">No results found for "{query}".</p>
         </div>
      ) : null}
      </motion.div>
      </div>
   );
}
