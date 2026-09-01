import { useState } from "react";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { useSettingsStore, type ByokProvider } from "../../store/settingsStore";
import { PROVIDERS, byokProviderConfig } from "../../data/aiTutor/models";
import { pingProvider } from "../../data/aiTutor/client";
import { getApiKey, setApiKey, deleteApiKey } from "../../data/aiTutor/secrets";

type TestState = { kind: "idle" | "testing" | "ok" | "error"; detail?: string };

export function ByokForm() {
   const provider = useSettingsStore((s) => s.byokProvider);
   const model = useSettingsStore((s) => s.byokModel);
   const keySaved = useSettingsStore((s) => s.byokKeySaved);
   const setProvider = useSettingsStore((s) => s.setByokProvider);
   const setModel = useSettingsStore((s) => s.setByokModel);
   const setKeySaved = useSettingsStore((s) => s.setByokKeySaved);

   const [keyInput, setKeyInput] = useState("");
   const [busy, setBusy] = useState(false);
   const [test, setTest] = useState<TestState>({ kind: "idle" });

   const meta = PROVIDERS[provider];

   const saveKey = async () => {
      const secret = keyInput.trim();
      if (!secret) return;
      setBusy(true);
      setTest({ kind: "idle" });
      try {
         await setApiKey(provider, secret);
         setKeySaved(true);
         setKeyInput("");
      } catch (err) {
         setTest({ kind: "error", detail: err instanceof Error ? err.message : "Couldn't save the key." });
      } finally {
         setBusy(false);
      }
   };

   const forgetKey = async () => {
      setBusy(true);
      try {
         await deleteApiKey(provider);
         setKeySaved(false);
         setTest({ kind: "idle" });
      } catch (err) {
         setTest({ kind: "error", detail: err instanceof Error ? err.message : "Couldn't remove the key." });
      } finally {
         setBusy(false);
      }
   };

   const testConnection = async () => {
      setTest({ kind: "testing" });
      try {
         const key = keyInput.trim();
         if (!key && !keySaved) {
            setTest({ kind: "error", detail: "Enter and save a key first." });
            return;
         }
         // Prefer the freshly typed key; otherwise use the one already in the keyring.
         const effectiveKey = key || (await getApiKey(provider)) || "";
         await pingProvider(byokProviderConfig(provider, model, effectiveKey));
         setTest({ kind: "ok" });
      } catch (err) {
         setTest({ kind: "error", detail: err instanceof Error ? err.message : "Connection failed." });
      }
   };

   return (
      <div className="space-y-4 rounded-2xl border border-border-hiyori bg-page p-4">
         <div>
            <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-ink-muted">Provider</label>
            <select
               value={provider}
               onChange={(event) => {
                  setProvider(event.target.value as ByokProvider);
                  setTest({ kind: "idle" });
               }}
               className="w-full rounded-xl border border-border-hiyori bg-surface px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            >
               {Object.values(PROVIDERS).map((entry) => (
                  <option key={entry.id} value={entry.id}>
                     {entry.label}
                  </option>
               ))}
            </select>
         </div>

         <div>
            <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-ink-muted">Model</label>
            <input
               type="text"
               value={model}
               onChange={(event) => setModel(event.target.value)}
               placeholder={meta.defaultModel}
               className="w-full rounded-xl border border-border-hiyori bg-surface px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <p className="mt-1 text-xs text-ink-faint">Leave blank to use {meta.defaultModel}.</p>
         </div>

         <div>
            <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-ink-muted">API key</label>
            {keySaved ? (
               <div className="flex items-center justify-between gap-3 rounded-xl border border-border-hiyori bg-surface px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-success">
                     <CheckCircle2 className="h-4 w-4" /> A key is saved in your OS keyring.
                  </span>
                  <button
                     type="button"
                     onClick={forgetKey}
                     disabled={busy}
                     className="text-sm font-bold text-destructive hover:underline disabled:opacity-40"
                  >
                     Forget
                  </button>
               </div>
            ) : (
               <div className="flex gap-2">
                  <input
                     type="password"
                     value={keyInput}
                     onChange={(event) => setKeyInput(event.target.value)}
                     placeholder="Paste your key"
                     autoComplete="off"
                     className="min-w-0 flex-1 rounded-xl border border-border-hiyori bg-surface px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  <button
                     type="button"
                     onClick={saveKey}
                     disabled={busy || !keyInput.trim()}
                     className="shrink-0 rounded-xl bg-brand px-5 py-3 font-bold text-white transition-all hover:bg-brand-hover disabled:opacity-40"
                  >
                     Save
                  </button>
               </div>
            )}
            <p className="mt-1 text-xs text-ink-faint">Get one from {meta.keyHint}.</p>
         </div>

         <div className="flex items-center gap-3">
            <button
               type="button"
               onClick={testConnection}
               disabled={test.kind === "testing"}
               className="rounded-xl border border-border-hiyori bg-surface px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface-hover disabled:opacity-40"
            >
               Test connection
            </button>
            {test.kind === "testing" && (
               <span className="flex items-center gap-1.5 text-sm text-ink-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Testing…
               </span>
            )}
            {test.kind === "ok" && (
               <span className="flex items-center gap-1.5 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" /> Connected.
               </span>
            )}
            {test.kind === "error" && (
               <span className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" /> {test.detail}
               </span>
            )}
         </div>
      </div>
   );
}
