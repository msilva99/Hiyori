import { useEffect } from "react";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useSettingsStore } from "../../store/settingsStore";
import { useAiLocalServerStore, type DownloadState } from "../../store/aiLocalServerStore";
import {
   GEMMA_LICENSE_URL,
   GEMMA_MODEL,
   LLAMA_CPP_LICENSE_URL,
   localAssetsConfigured,
} from "../../data/aiTutor/localAssets";

function ProgressRow({ label, ready, state, onDownload, onRemove }: {
   label: string;
   ready: boolean;
   state: DownloadState;
   onDownload: () => void;
   onRemove: () => void;
}) {
   const downloading = state.phase === "downloading" || state.phase === "verifying";
   return (
      <div className="rounded-xl border border-border-hiyori bg-surface p-3">
         <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-ink">{label}</span>
            {ready ? (
               <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-sm text-success">
                     <CheckCircle2 className="h-4 w-4" /> Ready
                  </span>
                  <button
                     type="button"
                     onClick={onRemove}
                     className="text-sm font-bold text-destructive hover:underline"
                  >
                     Remove
                  </button>
               </span>
            ) : (
               <button
                  type="button"
                  onClick={onDownload}
                  disabled={downloading}
                  className="rounded-lg bg-brand px-3 py-1.5 text-sm font-bold text-white transition-all hover:bg-brand-hover disabled:opacity-40"
               >
                  {downloading ? "Downloading…" : "Download"}
               </button>
            )}
         </div>
         {downloading && (
            <div className="mt-2 h-2 overflow-hidden rounded-full border border-border-hiyori bg-page">
               <div
                  className="h-full rounded-full bg-brand transition-all duration-200"
                  style={{ width: state.percent >= 0 ? `${state.percent}%` : "40%" }}
               />
            </div>
         )}
         {state.phase === "verifying" && <p className="mt-1 text-xs text-ink-faint">Verifying checksum…</p>}
         {state.phase === "error" && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-destructive">
               <AlertTriangle className="h-3.5 w-3.5" /> {state.error}
            </p>
         )}
      </div>
   );
}

export function LocalInferencePanel() {
   const licenseAccepted = useSettingsStore((s) => s.gemmaLicenseAccepted);
   const setLicenseAccepted = useSettingsStore((s) => s.setGemmaLicenseAccepted);
   const runtimeReady = useSettingsStore((s) => s.localRuntimeReady);
   const modelReady = useSettingsStore((s) => s.localModelReady);

   const {
      serverStatus,
      serverError,
      downloads,
      refreshStatus,
      download,
      removeAsset,
      startServer,
      stopServer,
   } = useAiLocalServerStore();

   useEffect(() => {
      void refreshStatus();
   }, [refreshStatus]);

   if (!localAssetsConfigured()) {
      return (
         <div className="rounded-2xl border border-border-hiyori bg-page p-4 text-sm text-ink-muted">
            Local model support isn't finished in this build yet - the runtime and model artifacts
            still need to be pinned. Use BYOK mode for now.
         </div>
      );
   }

   const approxGb = (GEMMA_MODEL.approxBytes / 1e9).toFixed(1);
   const canStart = runtimeReady && modelReady && serverStatus !== "running" && serverStatus !== "starting";

   return (
      <div className="space-y-4 rounded-2xl border border-border-hiyori bg-page p-4">
         <label className="flex items-start gap-3 text-sm">
            <input
               type="checkbox"
               checked={licenseAccepted}
               onChange={(event) => setLicenseAccepted(event.target.checked)}
               className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-hiyori text-brand focus:ring-brand"
            />
            <span className="text-ink-muted">
               I accept the{" "}
               <a href={GEMMA_LICENSE_URL} target="_blank" rel="noreferrer" className="text-brand underline">
                  Gemma Terms of Use
               </a>{" "}
               and the{" "}
               <a href={LLAMA_CPP_LICENSE_URL} target="_blank" rel="noreferrer" className="text-brand underline">
                  llama.cpp (MIT) license
               </a>
               . The model download is about {approxGb} GB and runs on your CPU, so replies may be slow.
            </span>
         </label>

         <div className={cn("space-y-2", !licenseAccepted && "pointer-events-none opacity-50")}>
            <ProgressRow
               label="Inference runtime"
               ready={runtimeReady}
               state={downloads.runtime}
               onDownload={() => void download("runtime")}
               onRemove={() => void removeAsset("runtime")}
            />
            <ProgressRow
               label="Model weights"
               ready={modelReady}
               state={downloads.model}
               onDownload={() => void download("model")}
               onRemove={() => void removeAsset("model")}
            />
         </div>

         <div className="flex items-center gap-3">
            {serverStatus === "running" ? (
               <button
                  type="button"
                  onClick={() => void stopServer()}
                  className="rounded-xl border border-border-hiyori bg-surface px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface-hover"
               >
                  Stop model
               </button>
            ) : (
               <button
                  type="button"
                  onClick={() => void startServer()}
                  disabled={!canStart}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white transition-all hover:bg-brand-hover disabled:opacity-40"
               >
                  Start model
               </button>
            )}
            {serverStatus === "starting" && (
               <span className="flex items-center gap-1.5 text-sm text-ink-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Starting…
               </span>
            )}
            {serverStatus === "running" && (
               <span className="flex items-center gap-1.5 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" /> Running
               </span>
            )}
            {serverStatus === "error" && serverError && (
               <span className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" /> {serverError}
               </span>
            )}
         </div>
      </div>
   );
}
