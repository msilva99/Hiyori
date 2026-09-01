import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { Bot, EyeOff, HardDrive, KeyRound } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { Modal } from "./Modal";
import { useSettingsStore, type AiTutorMode } from "../store/settingsStore";

// One-time chooser shown on the first desktop launch. Dismissing it (backdrop / Escape)
// counts as "Not now" so it never blocks the app, and it never reappears afterwards.
export function AiTutorOnboardingModal() {
   const navigate = useNavigate();
   const onboarded = useSettingsStore((state) => state.aiTutorOnboarded);
   const setAiTutorMode = useSettingsStore((state) => state.setAiTutorMode);
   const setAiTutorOnboarded = useSettingsStore((state) => state.setAiTutorOnboarded);

   if (!isTauri() || onboarded) return null;

   const choose = (mode: AiTutorMode) => {
      setAiTutorMode(mode);
      setAiTutorOnboarded(true);
      if (mode !== "off") navigate("/settings");
   };

   return createPortal(
      <Modal onClose={() => choose("off")} titleId="ai-tutor-onboarding-title" className="max-w-md w-full p-8">
         <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center">
               <Bot className="w-5 h-5 text-brand" />
            </div>
            <h3 id="ai-tutor-onboarding-title" className="text-xl font-bold text-ink">
               Meet the AI Tutor
            </h3>
         </div>
         <p className="text-ink-muted mb-6">
            A chat tutor for Japanese grammar, vocabulary, and usage. Pick how you'd like it to
            run - you can change this anytime in Settings.
         </p>

         <div className="space-y-3">
            <button
               onClick={() => choose("local")}
               className="w-full flex items-start gap-3 p-4 rounded-2xl border border-border-hiyori bg-page hover:bg-surface-hover hover:border-brand transition-all text-left cursor-pointer"
            >
               <HardDrive className="w-5 h-5 text-brand mt-0.5 shrink-0" />
               <span>
                  <span className="block font-bold text-ink">Use a local model</span>
                  <span className="block text-sm text-ink-muted mt-0.5">
                     Private and free. Downloads an on-device model once.
                  </span>
               </span>
            </button>

            <button
               onClick={() => choose("byok")}
               className="w-full flex items-start gap-3 p-4 rounded-2xl border border-border-hiyori bg-page hover:bg-surface-hover hover:border-brand transition-all text-left cursor-pointer"
            >
               <KeyRound className="w-5 h-5 text-brand mt-0.5 shrink-0" />
               <span>
                  <span className="block font-bold text-ink">Use my own API key</span>
                  <span className="block text-sm text-ink-muted mt-0.5">
                     Connect OpenRouter, OpenAI, Anthropic, or Gemini with your key.
                  </span>
               </span>
            </button>

            <button
               onClick={() => choose("off")}
               className="w-full flex items-start gap-3 p-4 rounded-2xl border border-transparent hover:bg-surface-hover transition-all text-left cursor-pointer"
            >
               <EyeOff className="w-5 h-5 text-ink-muted mt-0.5 shrink-0" />
               <span>
                  <span className="block font-bold text-ink">Not now</span>
                  <span className="block text-sm text-ink-muted mt-0.5">
                     Hide the AI Tutor. Turn it on later in Settings.
                  </span>
               </span>
            </button>
         </div>
      </Modal>,
      document.body
   );
}
