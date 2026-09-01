import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AiTutorMode = "off" | "local" | "byok";
export type ByokProvider = "openrouter" | "openai" | "anthropic" | "gemini";

type SettingsStore = {
   aiTutorMode: AiTutorMode;
   // Drives the one-time first-run chooser (AiTutorOnboardingModal). Once the user
   // has made a choice - including "Not now" - this stays true and the modal never
   // reappears.
   aiTutorOnboarded: boolean;

   byokProvider: ByokProvider;
   // Empty means "use the provider's default model" (resolved in data/aiTutor/models.ts).
   byokModel: string;
   // The key itself lives in the OS keyring, never here. This only tracks whether one exists.
   byokKeySaved: boolean;

   localRuntimeReady: boolean;
   localModelReady: boolean;
   gemmaLicenseAccepted: boolean;

   setAiTutorMode: (mode: AiTutorMode) => void;
   setAiTutorOnboarded: (onboarded: boolean) => void;
   setByokProvider: (provider: ByokProvider) => void;
   setByokModel: (model: string) => void;
   setByokKeySaved: (saved: boolean) => void;
   setLocalRuntimeReady: (ready: boolean) => void;
   setLocalModelReady: (ready: boolean) => void;
   setGemmaLicenseAccepted: (accepted: boolean) => void;
};

export const useSettingsStore = create<SettingsStore>()(
   persist(
      (set) => ({
         aiTutorMode: "off",
         aiTutorOnboarded: false,
         byokProvider: "gemini",
         byokModel: "",
         byokKeySaved: false,
         localRuntimeReady: false,
         localModelReady: false,
         gemmaLicenseAccepted: false,

         setAiTutorMode: (aiTutorMode) => set({ aiTutorMode }),
         setAiTutorOnboarded: (aiTutorOnboarded) => set({ aiTutorOnboarded }),
         setByokProvider: (byokProvider) => set({ byokProvider }),
         setByokModel: (byokModel) => set({ byokModel }),
         setByokKeySaved: (byokKeySaved) => set({ byokKeySaved }),
         setLocalRuntimeReady: (localRuntimeReady) => set({ localRuntimeReady }),
         setLocalModelReady: (localModelReady) => set({ localModelReady }),
         setGemmaLicenseAccepted: (gemmaLicenseAccepted) => set({ gemmaLicenseAccepted }),
      }),
      {
         name: "hiyori-settings",
         version: 1,
      }
   )
);
