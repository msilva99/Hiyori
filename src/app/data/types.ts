// These types describe the shape of Hiyori's saved data.
// Keep them plain and JSON-friendly because they will eventually be saved to disk.

export type Card = {
	id: string;
	kanji: string;
	kana: string;
	romaji: string;
	meaning: string;
	createdAt: string;
	updatedAt: string;
};

export type Deck = {
	id: string;
	title: string;
	cards: Card[];
	masteryPerfectSessions: number;
	createdAt: string;
	updatedAt: string;
};

export type JournalSlot = {
	id: string;
	icon: string;
	text: string;
};

export type JournalEntry = {
	id: string;
	// Stored as a string so JSON file/browser storage can save it safely.
	// Convert it to a Date in UI code only when date-fns needs a Date object.
	date: string; // "2026-04-29"
	title: string;
	body: string;
	slots: JournalSlot[];
	createdAt: string;
	updatedAt: string;
};

export type StudyLogEntry = {
	id: string;
	deckId: string;
	// Stored as ISO text so localStorage and future file exports stay JSON-friendly.
	studiedAt: string;
	cardsStudied: number;
	correctAttempts: number;
	wrongAttempts: number;
};

export type HiyoriData = {
	// Version gives us a way to migrate older saved data if this shape changes later.
	version: number;
	decks: Deck[];
	journalEntries: JournalEntry[];
	studyLog: StudyLogEntry[];
};
