import type { NormalizedDelta, ProviderConfig, ProviderWire, WireMessage } from "./types";

function applySampling(payload: Record<string, unknown>, config: ProviderConfig) {
   if (config.temperature !== undefined) payload.temperature = config.temperature;
   if (config.topP !== undefined) payload.top_p = config.topP;
   if (config.topK !== undefined) payload.top_k = config.topK;
}

export type BuiltRequest = { url: string; headers: Record<string, string>; body: string };

type BuildOpts = { stream?: boolean; maxTokens?: number };

export function buildRequest(
   config: ProviderConfig,
   system: string,
   messages: WireMessage[],
   opts: BuildOpts = {}
): BuiltRequest {
   const stream = opts.stream ?? true;
   return config.wire === "anthropic"
      ? buildAnthropic(config, system, messages, stream, opts.maxTokens)
      : buildOpenai(config, system, messages, stream);
}

function buildOpenai(
   config: ProviderConfig,
   system: string,
   messages: WireMessage[],
   stream: boolean
): BuiltRequest {
   const headers: Record<string, string> = { "Content-Type": "application/json" };
   if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
   Object.assign(headers, config.extraHeaders ?? {});

   const payload: Record<string, unknown> = {
      model: config.model,
      stream,
      messages: [{ role: "system", content: system }, ...messages],
   };
   applySampling(payload, config);

   return { url: `${config.baseUrl}/chat/completions`, headers, body: JSON.stringify(payload) };
}

function buildAnthropic(
   config: ProviderConfig,
   system: string,
   messages: WireMessage[],
   stream: boolean,
   maxTokens?: number
): BuiltRequest {
   const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
   };
   if (config.apiKey) headers["x-api-key"] = config.apiKey;

   const payload: Record<string, unknown> = {
      model: config.model,
      stream,
      max_tokens: maxTokens ?? config.maxTokens ?? 2048,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
   };
   applySampling(payload, config);

   return { url: `${config.baseUrl}/messages`, headers, body: JSON.stringify(payload) };
}

// --- streaming parse ---

export type ParseState = { done: boolean };

export function createParseState(): ParseState {
   return { done: false };
}

type OpenAiChunk = {
   error?: { message?: string };
   choices?: { delta?: { content?: string }; finish_reason?: string | null }[];
};

type AnthropicEvent = {
   type?: string;
   delta?: { type?: string; text?: string; stop_reason?: string | null };
   error?: { message?: string };
};

export function parseEvent(
   wire: ProviderWire,
   evt: { data: string; event?: string },
   state: ParseState
): NormalizedDelta[] {
   return wire === "anthropic" ? parseAnthropic(evt, state) : parseOpenai(evt, state);
}

function parseOpenai(evt: { data: string }, state: ParseState): NormalizedDelta[] {
   const data = evt.data.trim();
   if (!data) return [];
   if (data === "[DONE]") {
      state.done = true;
      return [{ type: "done" }];
   }

   let chunk: OpenAiChunk;
   try {
      chunk = JSON.parse(data) as OpenAiChunk;
   } catch {
      return [];
   }

   if (chunk.error) return [{ type: "error", message: chunk.error.message ?? "Stream error." }];

   const choice = chunk.choices?.[0];
   if (!choice) return [];

   const out: NormalizedDelta[] = [];
   const text = choice.delta?.content;
   if (typeof text === "string" && text.length > 0) out.push({ type: "text", value: text });
   if (choice.finish_reason) out.push({ type: "done", finishReason: choice.finish_reason });
   return out;
}

function parseAnthropic(evt: { data: string; event?: string }, state: ParseState): NormalizedDelta[] {
   const data = evt.data.trim();
   if (!data) return [];

   let event: AnthropicEvent;
   try {
      event = JSON.parse(data) as AnthropicEvent;
   } catch {
      return [];
   }

   switch (event.type ?? evt.event) {
      case "content_block_delta":
         return event.delta?.type === "text_delta" && typeof event.delta.text === "string"
            ? [{ type: "text", value: event.delta.text }]
            : [];
      case "message_delta":
         return event.delta?.stop_reason ? [{ type: "done", finishReason: event.delta.stop_reason }] : [];
      case "message_stop":
         state.done = true;
         return [{ type: "done" }];
      case "error":
         return [{ type: "error", message: event.error?.message ?? "Stream error." }];
      default:
         return [];
   }
}
