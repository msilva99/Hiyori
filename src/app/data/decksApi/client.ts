import { DECKS_API_URL } from "./config";
import { apiFetch } from "./transport";
import {
   DecksApiError,
   type RemoteCard,
   type RemoteDeckDetail,
   type RemoteDeckSummary,
} from "./types";

export type DeckListQuery = { categories?: string[]; q?: string };

// --- response parsing -------------------------------------------------------
// The API is trusted, but a redeploy could still ship a malformed deck. Coerce
// tolerantly (same spirit as parseDeckImport in pages/Decks.tsx) and reject the
// whole response only if its top-level shape is wrong.

function toText(value: unknown): string {
   return typeof value === "string" ? value : "";
}

function toStringArray(value: unknown): string[] {
   return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseSummary(value: unknown): RemoteDeckSummary | null {
   if (!value || typeof value !== "object") return null;
   const raw = value as Record<string, unknown>;
   if (typeof raw.id !== "number" || typeof raw.title !== "string") return null;

   return {
      id: raw.id,
      title: raw.title,
      categories: toStringArray(raw.categories),
      description: typeof raw.description === "string" ? raw.description : null,
      card_count: typeof raw.card_count === "number" ? raw.card_count : 0,
   };
}

function parseCard(value: unknown): RemoteCard | null {
   if (!value || typeof value !== "object") return null;
   const raw = value as Record<string, unknown>;
   if (typeof raw.id !== "number") return null;

   const card: RemoteCard = {
      id: raw.id,
      kanji: toText(raw.kanji),
      kana: toText(raw.kana),
      romaji: toText(raw.romaji),
      meaning: toText(raw.meaning),
   };

   // A row with nothing on it is unusable - drop it rather than import a blank card.
   if (!card.kanji && !card.kana && !card.romaji && !card.meaning) return null;
   return card;
}

// --- HTTP -----------------------------------------------------------------

async function extractMessage(res: Response): Promise<string> {
   const bodyText = await res.text().catch(() => "");
   try {
      const parsed = JSON.parse(bodyText) as { detail?: string; message?: string };
      return parsed.detail ?? parsed.message ?? (bodyText.slice(0, 200) || `HTTP ${res.status}`);
   } catch {
      return bodyText.slice(0, 200) || `HTTP ${res.status}`;
   }
}

async function getJson(path: string): Promise<unknown> {
   let res: Response;
   try {
      res = await apiFetch(`${DECKS_API_URL}${path}`);
   } catch (err) {
      throw new DecksApiError("transport", err instanceof Error ? err.message : "Network request failed.");
   }

   if (res.status === 404) {
      throw new DecksApiError("not_found", await extractMessage(res));
   }
   if (!res.ok) {
      throw new DecksApiError("transport", await extractMessage(res));
   }

   try {
      return await res.json();
   } catch {
      throw new DecksApiError("parse", "The library response wasn't valid JSON.");
   }
}

// GET /decks/ - the catalog, without card contents. Trailing slash is required
// (the API 307-redirects /decks -> /decks/).
export async function fetchDeckList(opts: DeckListQuery = {}): Promise<RemoteDeckSummary[]> {
   const params = new URLSearchParams();
   for (const category of opts.categories ?? []) {
      if (category) params.append("category", category);
   }
   if (opts.q?.trim()) params.set("q", opts.q.trim());

   const qs = params.toString();
   const data = await getJson(`/decks/${qs ? `?${qs}` : ""}`);

   if (!Array.isArray(data)) {
      throw new DecksApiError("parse", "The library sent an unexpected response.");
   }
   return data.map(parseSummary).filter((deck): deck is RemoteDeckSummary => deck !== null);
}

// GET /decks/{id} - one deck with all its cards.
export async function fetchDeckDetail(id: number): Promise<RemoteDeckDetail> {
   const data = await getJson(`/decks/${id}`);
   const summary = parseSummary(data);
   if (!summary || !data || typeof data !== "object" || !Array.isArray((data as Record<string, unknown>).cards)) {
      throw new DecksApiError("parse", "That deck came back in an unexpected shape.");
   }

   const cards = ((data as Record<string, unknown>).cards as unknown[])
      .map(parseCard)
      .filter((card): card is RemoteCard => card !== null);

   return { ...summary, cards };
}
