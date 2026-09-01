import { motion } from "motion/react";
import { Bot } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { cn } from "../../../lib/utils";
import { useSettingsStore, type AiTutorMode } from "../../store/settingsStore";
import { ByokForm } from "./ByokForm";
import { LocalInferencePanel } from "./LocalInferencePanel";

const MODE_OPTIONS: { value: AiTutorMode; label: string; hint: string }[] = [
   { value: "off", label: "Off", hint: "Hidden from the sidebar." },
   { value: "local", label: "Local", hint: "Runs an on-device model. Private and free." },
   { value: "byok", label: "Your API key", hint: "Connect a provider with your own key." },
];

export function AiTutorSettingsCard() {
   const desktop = isTauri();
   const aiTutorMode = useSettingsStore((state) => state.aiTutorMode);
   const setAiTutorMode = useSettingsStore((state) => state.setAiTutorMode);

   return (
      <motion.div
         initial={{ opacity: 0, y: 10 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.15 }}
         className="bg-surface border border-border-hiyori rounded-3xl shadow-sm p-6"
      >
         <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
            <Bot className="w-5 h-5 text-brand" /> AI Tutor
         </h2>

         {!desktop ? (
            <p className="text-ink-muted">The AI Tutor is only available in the Hiyori desktop app.</p>
         ) : (
            <div className="space-y-4">
               <p className="text-sm text-ink-muted">
                  A chat tutor for Japanese grammar, vocabulary, and usage. Choose how it runs.
               </p>

               <div className="flex flex-wrap gap-2">
                  {MODE_OPTIONS.map((option) => (
                     <button
                        key={option.value}
                        type="button"
                        onClick={() => setAiTutorMode(option.value)}
                        className={cn(
                           "px-5 py-2.5 rounded-xl font-bold text-sm border transition-all",
                           aiTutorMode === option.value
                              ? "border-brand bg-brand text-white shadow-sm shadow-brand/20"
                              : "border-border-hiyori bg-page text-ink-muted hover:bg-surface-hover hover:text-ink"
                        )}
                     >
                        {option.label}
                     </button>
                  ))}
               </div>

               <p className="text-sm text-ink-muted">
                  {MODE_OPTIONS.find((option) => option.value === aiTutorMode)?.hint}
               </p>

               {aiTutorMode === "byok" && <ByokForm />}
               {aiTutorMode === "local" && <LocalInferencePanel />}
            </div>
         )}
      </motion.div>
   );
}
