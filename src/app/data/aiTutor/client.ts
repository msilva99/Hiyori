import { buildSystemPrompt, SCOPE_PRIMER } from "./persona";
import { readSse } from "./sse";
import { streamingFetch } from "./transport";
import { AiTutorError, type NormalizedDelta, type ProviderConfig, type WireMessage } from "./types";
import { buildRequest, createParseState, parseEvent } from "./wire";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type StreamCallbacks = {
   onText: (chunk: string) => void;
   onDone: (finishReason?: string) => void;
};

function isAbort(err: unknown): boolean {
   return err instanceof DOMException && err.name === "AbortError";
}

function extractMessage(bodyText: string): string {
   try {
      const parsed = JSON.parse(bodyText) as { error?: { message?: string } | string; message?: string };
      const err = parsed.error;
      if (typeof err === "string") return err;
      return err?.message ?? parsed.message ?? bodyText.slice(0, 300);
   } catch {
      return bodyText.slice(0, 300) || "Request failed.";
   }
}

function classify(status: number, bodyText: string): AiTutorError {
   const detail = extractMessage(bodyText);
   if (status === 401 || status === 403) return new AiTutorError("auth", detail);
   if (status === 429) return new AiTutorError("rate_limit", detail);
   return new AiTutorError("transport", detail);
}

// Streams one assistant turn. Resolves when the stream completes OR is aborted
// (aborting is not an error - the caller keeps whatever text arrived). Throws
// AiTutorError for auth / rate-limit / transport failures.
export async function streamChat(opts: {
   turns: ChatTurn[];
   config: ProviderConfig;
   signal?: AbortSignal;
   callbacks: StreamCallbacks;
}): Promise<void> {
   const { turns, config, signal, callbacks } = opts;

   const messages: WireMessage[] = [...SCOPE_PRIMER, ...turns];
   const req = buildRequest(config, buildSystemPrompt(), messages);

   let res: Response;
   try {
      res = await streamingFetch(
         req.url,
         { method: "POST", headers: req.headers, body: req.body },
         signal
      );
   } catch (err) {
      if (isAbort(err)) return;
      throw new AiTutorError("transport", err instanceof Error ? err.message : "Network request failed.");
   }

   if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw classify(res.status, text);
   }

   const state = createParseState();
   let finishReason: string | undefined;
   let streamError: AiTutorError | undefined;

   try {
      await readSse(res, {
         signal,
         onEvent: (evt) => {
            if (streamError) return;
            const deltas: NormalizedDelta[] = parseEvent(config.wire, evt, state);
            for (const delta of deltas) {
               if (delta.type === "text") callbacks.onText(delta.value);
               else if (delta.type === "done") finishReason = delta.finishReason ?? finishReason;
               else streamError = new AiTutorError("transport", delta.message);
            }
         },
      });
   } catch (err) {
      if (isAbort(err)) return;
      throw err;
   }

   if (streamError) throw streamError;
   callbacks.onDone(finishReason);
}

// One-shot, non-streaming call for the "Test connection" button.
export async function pingProvider(config: ProviderConfig, signal?: AbortSignal): Promise<void> {
   const req = buildRequest(config, "You are a connection test.", [{ role: "user", content: "ping" }], {
      stream: false,
      maxTokens: 1,
   });

   let res: Response;
   try {
      res = await streamingFetch(
         req.url,
         { method: "POST", headers: req.headers, body: req.body },
         signal
      );
   } catch (err) {
      throw new AiTutorError("transport", err instanceof Error ? err.message : "Network request failed.");
   }

   if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw classify(res.status, text);
   }
}
