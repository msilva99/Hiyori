import { Link } from "react-router";
import { motion } from "motion/react";
import { 
   Flame, 
   Target, 
   Book, 
   ChevronRight, 
   PenTool, 
   Play, 
   CalendarDays,
   Sparkles,
   TrendingUp
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useDecksStore } from "../store/decksStore";
import { useStudyLogStore } from "../store/studyLogStore";
import type { Deck, StudyLogEntry } from "../data/types";

const DAILY_GOAL_CARDS = 10;

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

function getLocalDateKey(date: Date) {
   const year = date.getFullYear();
   const month = `${date.getMonth() + 1}`.padStart(2, "0");
   const day = `${date.getDate()}`.padStart(2, "0");
   
   return `${year}-${month}-${day}`;
}

function getStartOfWeek(date: Date) {
   const startOfWeek = new Date(date);
   const mondayBasedDay = (date.getDay() + 6) % 7;
   startOfWeek.setDate(date.getDate() - mondayBasedDay);
   startOfWeek.setHours(0, 0, 0, 0);
   
   return startOfWeek;
}

function getStudyCardsByDate(studyLog: StudyLogEntry[]) {
   return studyLog.reduce<Record<string, number>>((cardsByDate, entry) => {
      const dateKey = getLocalDateKey(new Date(entry.studiedAt));
      cardsByDate[dateKey] = (cardsByDate[dateKey] ?? 0) + entry.cardsStudied;
      
      return cardsByDate;
   }, {});
}

function getCurrentStreak(cardsByDate: Record<string, number>) {
   let streak = 0;
   const cursorDate = new Date();
   const todayCardsStudied = cardsByDate[getLocalDateKey(cursorDate)] ?? 0;
   
   if (todayCardsStudied === 0) {
      cursorDate.setDate(cursorDate.getDate() - 1);
   }
   
   while ((cardsByDate[getLocalDateKey(cursorDate)] ?? 0) > 0) {
      streak += 1;
      cursorDate.setDate(cursorDate.getDate() - 1);
   }
   
   return streak;
}

function getWeekDays(cardsByDate: Record<string, number>) {
   const todayKey = getLocalDateKey(new Date());
   const startOfWeek = getStartOfWeek(new Date());
   const labels = ["M", "T", "W", "T", "F", "S", "S"];
   
   return labels.map((day, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);
      const dateKey = getLocalDateKey(date);
      
      return {
         day,
         date: date.getDate(),
         studied: (cardsByDate[dateKey] ?? 0) > 0,
         isToday: dateKey === todayKey,
      };
   });
}

function getLastStudiedAt(deckId: string, studyLog: StudyLogEntry[]) {
   return studyLog
   .filter((entry) => entry.deckId === deckId && entry.cardsStudied > 0)
   .map((entry) => entry.studiedAt)
   .sort()
   .at(-1);
}

function getLastStudiedLabel(lastStudiedAt: string | undefined) {
   if (!lastStudiedAt) {
      return "Not studied yet";
   }
   
   const today = new Date();
   const studiedDate = new Date(lastStudiedAt);
   const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
   const studiedStart = new Date(studiedDate.getFullYear(), studiedDate.getMonth(), studiedDate.getDate());
   const dayDifference = Math.round((todayStart.getTime() - studiedStart.getTime()) / 86400000);
   
   if (dayDifference === 0) {
      return "Today";
   }
   
   if (dayDifference === 1) {
      return "Yesterday";
   }
   
   return `${dayDifference} days ago`;
}

function getRecentDecks(decks: Deck[], studyLog: StudyLogEntry[]) {
   return decks
   .map((deck, index) => {
      const lastStudiedAt = getLastStudiedAt(deck.id, studyLog);
      
      return {
         deck,
         color: getDeckColor(index),
         lastStudiedAt,
         lastStudied: getLastStudiedLabel(lastStudiedAt),
      };
   })
   .sort((a, b) => {
      const aTime = new Date(a.lastStudiedAt ?? a.deck.updatedAt).getTime();
      const bTime = new Date(b.lastStudiedAt ?? b.deck.updatedAt).getTime();
      
      return bTime - aTime;
   })
   .slice(0, 3);
}

function getLeastRecentlyStudiedDeck(decks: Deck[], studyLog: StudyLogEntry[]) {
   return decks
   .filter((deck) => deck.cards.length > 0)
   .map((deck) => ({
      deck,
      lastStudiedAt: getLastStudiedAt(deck.id, studyLog),
   }))
   .sort((a, b) => {
      if (!a.lastStudiedAt && !b.lastStudiedAt) {
         return 0;
      }
      
      if (!a.lastStudiedAt) {
         return -1;
      }
      
      if (!b.lastStudiedAt) {
         return 1;
      }
      
      return new Date(a.lastStudiedAt).getTime() - new Date(b.lastStudiedAt).getTime();
   })
   .at(0)?.deck;
}

export function Home() {
   const decks = useDecksStore((state) => state.decks);
   const studyLog = useStudyLogStore((state) => state.studyLog);
   const cardsByDate = getStudyCardsByDate(studyLog);
   const weekDays = getWeekDays(cardsByDate);
   const currentStreak = getCurrentStreak(cardsByDate);
   const studiedToday = cardsByDate[getLocalDateKey(new Date())] ?? 0;
   const dailyGoal = { current: Math.min(studiedToday, DAILY_GOAL_CARDS), total: DAILY_GOAL_CARDS };
   const remainingCards = Math.max(dailyGoal.total - dailyGoal.current, 0);
   const nextStudyDeck = getLeastRecentlyStudiedDeck(decks, studyLog);
   const continueStudyPath = nextStudyDeck ? `/decks/${nextStudyDeck.id}/study` : "/decks";
   const studyButtonLabel = studiedToday === 0 ? "Start Study" : "Continue Study";
   const recentDecks = getRecentDecks(decks, studyLog);
   
   // SVG progress circles are controlled by strokeDashoffset: lower offset means more progress.
   const progressPercentage = (dailyGoal.current / dailyGoal.total) * 100;
   const circumference = 2 * Math.PI * 36;
   const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;
   
   return (
   <div className="space-y-10 font-sans max-w-5xl mx-auto w-full">
      {/* Header */}
      <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="flex items-end justify-between"
      >
      <div>
         <h1 className="text-4xl font-extrabold text-ink tracking-tight">おかえり！ Welcome back</h1>
         <p className="text-ink-muted mt-2 text-lg">
            {remainingCards > 0
               ? `Study ${remainingCards} more cards to hit today's goal.`
               : "Daily goal complete. You can still practice more if you want."}
            </p>
         </div>
      </motion.div>
      
      {/* Top Stats Row */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Streak Card */}
          <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-surface rounded-[28px] p-6 shadow-sm border border-border-hiyori flex flex-col justify-between relative overflow-hidden group"
         >
         <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-brand/10 to-transparent rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
         <div className="flex items-center justify-between mb-4">
            <h2 className="text-ink-muted font-medium flex items-center gap-2">
               <Flame className="w-5 h-5 text-brand fill-brand" /> Day Streak
            </h2>
            {studiedToday > 0 && (
               <div className="bg-brand-surface text-brand text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Active
               </div>
               )}
            </div>
            <div className="flex items-end gap-2">
               <span className="text-5xl font-black text-ink">{currentStreak}</span>
               <span className="text-ink-muted mb-1 font-medium">days</span>
            </div>
            
            {/* Week days tracker */}
            <div className="flex justify-between items-end mt-6 flex-wrap gap-y-3">
               {weekDays.map((day, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                     <div 
                     className={cn(
                     "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                     day.isToday && "ring-2 ring-offset-2 ring-brand",
                     day.studied ? "bg-brand text-white shadow-sm shadow-brand/30" : "bg-surface-hover text-ink-faint"
                     )}
                     >
                     {day.studied && !day.isToday && <Sparkles className="w-3 h-3 absolute" />}
                     {day.isToday && !day.studied ? <span className="w-2 h-2 rounded-full bg-surface opacity-50 block" /> : null}
                  </div>
                  <span className={cn(
                  "text-xs font-bold", 
                  day.isToday ? "text-brand" : "text-ink-faint"
                  )}>
                  {day.day}
               </span>
            </div>
            ))}
         </div>
      </motion.div>
      
      {/* Daily Goal Card */}
      <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="bg-surface rounded-[28px] p-6 shadow-sm border border-border-hiyori flex items-center gap-6 relative overflow-hidden"
      >
      <div className="absolute right-0 bottom-0 w-48 h-48 bg-linear-to-tl from-success/10 to-transparent rounded-tl-full -z-10" />
      <div className="relative shrink-0 w-28 h-28">
         <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" className="text-surface-hover stroke-current" strokeWidth="8" fill="transparent" />
            <circle 
            cx="40" cy="40" r="36" 
            className="text-success stroke-current" 
            strokeWidth="8" 
            fill="transparent" 
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset} 
            strokeLinecap="round" 
            />
         </svg>
         <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-ink">{dailyGoal.current}</span>
            <span className="text-xs text-ink-muted font-medium">/ {dailyGoal.total}</span>
         </div>
      </div>
      
      <div className="flex-1">
         <h2 className="text-ink-muted font-medium flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-success" /> Daily Goal
         </h2>
         <h3 className="text-2xl font-bold text-ink mb-1">Study 10 Cards</h3>
         <p className="text-ink-muted text-sm mb-6 max-w-xs">
            {remainingCards > 0
               ? `${remainingCards} cards left for today.`
               : "You reached today's card goal."}
            </p>
            <Link to={continueStudyPath} className="bg-success hover:bg-success-hover text-white px-6 py-2.5 rounded-xl font-medium transition-colors inline-flex items-center gap-2 shadow-sm shadow-success/20">
               {studyButtonLabel} <Play className="w-4 h-4 fill-current" />
            </Link>
         </div>
      </motion.div>
   </div>
   
   {/* Main Actions Row */}
   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Learn Kana Link */}
      <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
      >
      <Link to="/kana" className="block h-full bg-surface hover:bg-card-hover border border-border-hiyori rounded-[28px] p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 group relative overflow-hidden">
         <div className="absolute -right-6 -bottom-6 text-9xl text-surface-hover opacity-50 font-black tracking-tighter group-hover:scale-110 transition-transform select-none">あ</div>
         <div className="flex items-start justify-between relative z-10">
            <div className="w-12 h-12 bg-deck-cream text-brand rounded-2xl flex items-center justify-center mb-4">
               <Book className="w-6 h-6" />
            </div>
            <div className="w-8 h-8 bg-surface rounded-full flex items-center justify-center shadow-sm text-ink-muted group-hover:bg-brand group-hover:text-white transition-colors">
               <ChevronRight className="w-5 h-5" />
            </div>
         </div>
         <h3 className="text-xl font-bold text-ink mb-2 relative z-10">Learn Kana</h3>
         <p className="text-ink-muted text-sm relative z-10">Master Hiragana and Katakana with our interactive typing practice.</p>
      </Link>
   </motion.div>
   
   {/* Journal CTA */}
   <motion.div 
   initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
   >
   <div className="h-full bg-surface border border-border-hiyori rounded-[28px] p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
      <div className="absolute right-0 top-0 w-32 h-32 bg-linear-to-bl from-deck-sky/10 to-transparent rounded-bl-full -z-10" />
      <div>
         <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-deck-sky-surface text-brand rounded-2xl flex items-center justify-center">
               <PenTool className="w-6 h-6" />
            </div>
            <span className="bg-surface-hover text-ink-muted text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
               <CalendarDays className="w-3 h-3" /> Today
            </span>
         </div>
         <h3 className="text-xl font-bold text-ink mb-2">Daily Journal</h3>
         <p className="text-ink-muted text-sm">Write a short entry in Japanese. We'll highlight words you're learning!</p>
      </div>
      <Link to="/journal" className="mt-6 bg-page hover:bg-surface-hover border border-border-hiyori text-ink w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
         Write Entry
      </Link>
   </div>
</motion.div>
</div>

{/* Decks Section */}
<motion.div 
initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
>
<div className="flex items-center justify-between mb-6">
   <h2 className="text-2xl font-bold text-ink">Recent Decks</h2>
   <Link to="/decks" className="text-brand font-medium hover:underline flex items-center gap-1">
      View all <ChevronRight className="w-4 h-4" />
   </Link>
</div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
   {recentDecks.map(({ deck, color, lastStudied }) => (
   <Link to={`/decks/${deck.id}`} key={deck.id} className="bg-surface rounded-3xl p-6 border border-border-hiyori shadow-sm hover:shadow-md transition-shadow cursor-pointer group flex flex-col">
      <div className="flex justify-between items-start mb-6">
         <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", color, "bg-opacity-20")}>
            <Book className={cn("w-6 h-6", color.replace('bg-', 'text-'))} />
         </div>
         <div className="w-8 h-8 bg-page rounded-full flex items-center justify-center text-ink-muted group-hover:bg-brand group-hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
         </div>
      </div>
      
      <div className="flex-1">
         <h3 className="font-bold text-lg text-ink mb-1 group-hover:text-brand transition-colors">{deck.title}</h3>
         <p className="text-ink-muted text-sm mb-6">{deck.cards.length} cards • {lastStudied}</p>
      </div>
      
      <div>
         <div className="flex justify-between items-end mb-2">
            <span className="text-sm font-bold text-ink">Ready</span>
            <span className="text-xs text-ink-muted font-medium">{deck.cards.length} cards</span>
         </div>
         <div className="w-full bg-surface-hover rounded-full h-2 overflow-hidden">
            <div 
            className="bg-success h-2 rounded-full transition-all duration-1000 ease-out" 
            style={{ width: deck.cards.length > 0 ? "100%" : "0%" }} 
            />
         </div>
      </div>
   </Link>
   ))}
</div>

{recentDecks.length === 0 && (
   <div className="bg-surface rounded-3xl p-8 border border-border-hiyori shadow-sm text-center">
      <h3 className="font-bold text-lg text-ink">No decks yet</h3>
      <p className="text-ink-muted text-sm mt-2">Create a deck to start filling your dashboard with study data.</p>
      <Link to="/decks" className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-colors">
         Go to Decks <ChevronRight className="w-4 h-4" />
      </Link>
   </div>
   )}
</motion.div>
</div>
);
}
