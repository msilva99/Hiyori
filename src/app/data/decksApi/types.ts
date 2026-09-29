// Response shapes for the Hiyori Deck API (see ../../../../DecksAPI/context.md).
// These describe what the API sends over the wire - not Hiyori's local Deck/Card,
// which the download step maps onto.

export type RemoteCard = {
   // Unique within its deck only, not globally. Dropped at the import boundary -
   // Hiyori's local cards get their own generated ids.
   id: number;
   kanji: string;
   kana: string;
   romaji: string;
   meaning: string;
};

export type RemoteDeckSummary = {
   id: number;
   title: string;
   // Topic tags AND level codes mixed together, e.g. ["N5", "food"]. There is no
   // separate level field.
   categories: string[];
   // null when the source deck has no blurb.
   description: string | null;
   card_count: number;
};

export type RemoteDeckDetail = RemoteDeckSummary & {
   cards: RemoteCard[];
};

export type DecksApiErrorKind =
   // The requested deck id returned 404.
   | "not_found"
   // Network failure or a non-OK status from the API.
   | "transport"
   // The response wasn't the JSON shape we expect.
   | "parse";

// Mirrors AiTutorError in ../aiTutor/types.ts: a typed error the UI can branch on.
export class DecksApiError extends Error {
   kind: DecksApiErrorKind;

   constructor(kind: DecksApiErrorKind, message: string) {
      super(message);
      this.name = "DecksApiError";
      this.kind = kind;
   }
}
