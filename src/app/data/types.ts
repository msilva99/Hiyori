// These types describe the shape of Hiyori's saved data.
// Keep them plain and JSON-friendly because they will eventually be saved to disk.

export type CardSrsState = {
	// ISO date/time string. New cards default to "now" so they're immediately due.
	dueDate: string;
	// Days until the next review, once the card has been reviewed at least once.
	interval: number;
	// SM-2-style ease factor; grows slightly on "easy", shrinks on "again".
	easeFactor: number;
	// Consecutive correct (good/easy) reviews since the last "again".
	repetitions: number;
};

export type Card = {
	id: string;
	kanji: string;
	kana: string;
	romaji: string;
	meaning: string;
	srs: CardSrsState;
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

export type AiTutorMessage = {
	id: string;
	role: "user" | "assistant";
	content: string;
	// ISO text, same convention as the rest of this file.
	createdAt: string;
	// Which model produced an assistant message (display only).
	model?: string;
	// The stream was stopped or failed before the answer finished.
	incomplete?: boolean;
	// The turn ended in an error rather than a real answer.
	error?: boolean;
};

export type AiTutorConversation = {
	id: string;
	title: string;
	messages: AiTutorMessage[];
	createdAt: string;
	updatedAt: string;
	// e.g. "Gemini · gemini-2.0-flash" - shown in the UI, never contains a secret.
	providerLabel?: string;
};
