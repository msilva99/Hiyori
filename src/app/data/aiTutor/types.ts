export type ChatRole = "system" | "user" | "assistant";

export type WireMessage = { role: ChatRole; content: string };

export type ProviderWire = "openai" | "anthropic";

export type ProviderConfig = {
   wire: ProviderWire;
   // No trailing slash. e.g. "https://openrouter.ai/api/v1" or "http://127.0.0.1:8080/v1".
   baseUrl: string;
   // Omitted for the local server.
   apiKey?: string;
   model: string;
   // Non-secret provider attribution headers (OpenRouter). Never put a key here.
   extraHeaders?: Record<string, string>;
   // Anthropic requires a max_tokens; the OpenAI branch ignores it.
   maxTokens?: number;
   // Sampling. Only sent when set - local mode pins Gemma's recommended values;
   // BYOK leaves them unset so the provider default applies.
   temperature?: number;
   topP?: number;
   topK?: number;
};

export type NormalizedDelta =
   | { type: "text"; value: string }
   | { type: "done"; finishReason?: string }
   | { type: "error"; message: string };

export type AiTutorErrorKind = "auth" | "rate_limit" | "transport" | "local_server";

export class AiTutorError extends Error {
   kind: AiTutorErrorKind;

   constructor(kind: AiTutorErrorKind, message: string) {
      super(message);
      this.name = "AiTutorError";
      this.kind = kind;
   }
}
