import type { ByokProvider } from "../../store/settingsStore";
import type { ProviderConfig, ProviderWire } from "./types";

export type ProviderMeta = {
   id: ByokProvider;
   label: string;
   wire: ProviderWire;
   baseUrl: string;
   defaultModel: string;
   keyUrl: string;
   keyHint: string;
};

// Gemini is first because its no-card free tier is the only zero-cost way to test a
// real remote call.
export const PROVIDERS: Record<ByokProvider, ProviderMeta> = {
   gemini: {
      id: "gemini",
      label: "Google Gemini",
      wire: "openai",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      defaultModel: "gemini-2.0-flash",
      keyUrl: "https://aistudio.google.com/apikey",
      keyHint: "Google AI Studio -> Get API key",
   },
   openrouter: {
      id: "openrouter",
      label: "OpenRouter",
      wire: "openai",
      baseUrl: "https://openrouter.ai/api/v1",
      defaultModel: "google/gemini-2.0-flash-exp:free",
      keyUrl: "https://openrouter.ai/keys",
      keyHint: "openrouter.ai -> Keys",
   },
   openai: {
      id: "openai",
      label: "OpenAI",
      wire: "openai",
      baseUrl: "https://api.openai.com/v1",
      defaultModel: "gpt-4o-mini",
      keyUrl: "https://platform.openai.com/api-keys",
      keyHint: "platform.openai.com -> API keys",
   },
   anthropic: {
      id: "anthropic",
      label: "Anthropic (Claude)",
      wire: "anthropic",
      baseUrl: "https://api.anthropic.com/v1",
      defaultModel: "claude-3-5-haiku-latest",
      keyUrl: "https://console.anthropic.com/settings/keys",
      keyHint: "console.anthropic.com -> API keys (separate from Claude Pro)",
   },
};

export const LOCAL_MODEL_ID = "gemma-4-e2b";

export function localProviderConfig(port: number): ProviderConfig {
   return {
      wire: "openai",
      baseUrl: `http://127.0.0.1:${port}/v1`,
      model: LOCAL_MODEL_ID,
      // Gemma's recommended sampling for Gemma 3/4.
      temperature: 1.0,
      topP: 0.95,
      topK: 64,
   };
}

export function byokProviderConfig(provider: ByokProvider, model: string, apiKey: string): ProviderConfig {
   const meta = PROVIDERS[provider];
   const config: ProviderConfig = {
      wire: meta.wire,
      baseUrl: meta.baseUrl,
      apiKey,
      model: model.trim() || meta.defaultModel,
   };
   if (meta.wire === "anthropic") config.maxTokens = 2048;
   if (provider === "openrouter") {
      config.extraHeaders = { "HTTP-Referer": "https://jp.msilva.dev", "X-Title": "Hiyori" };
   }
   return config;
}

export function providerLabel(provider: ByokProvider, model: string): string {
   const meta = PROVIDERS[provider];
   return `${meta.label} - ${model.trim() || meta.defaultModel}`;
}
