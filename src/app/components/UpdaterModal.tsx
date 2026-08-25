import { createPortal } from "react-dom";
import { DownloadCloud, AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { useUpdaterStore } from "../store/updaterStore";

export function UpdaterModal() {
   const { status, update, progress, error, hasSurfaced, installUpdate, dismiss } = useUpdaterStore();

   if (!hasSurfaced) return null;

   // Downloading/installing can't be dismissed mid-flight - the backdrop click and Escape
   // handled by Modal's focus trap should simply be ignored in those states.
   const canClose = status === "available" || status === "error";
   const handleClose = () => {
      if (canClose) dismiss();
   };

   return createPortal(
      <Modal onClose={handleClose} titleId="updater-title" className="max-w-md w-full p-8">
         {status === "available" && update && (
            <>
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center">
                     <DownloadCloud className="w-5 h-5 text-brand" />
                  </div>
                  <h3 id="updater-title" className="text-xl font-bold text-ink">Update available</h3>
               </div>
               <p className="text-ink-muted mb-4">
                  Hiyori {update.version} is ready to install{update.currentVersion ? ` (you're on ${update.currentVersion})` : ""}.
               </p>
               {update.body && (
                  <div className="bg-page rounded-2xl border border-border-hiyori p-4 mb-6 max-h-40 overflow-y-auto">
                     <p className="text-xs font-bold text-ink-faint uppercase tracking-wider mb-2">What's new</p>
                     <p className="text-ink-muted text-sm whitespace-pre-wrap">{update.body}</p>
                  </div>
               )}
               <div className="flex gap-3">
                  <button
                     onClick={dismiss}
                     className="flex-1 px-6 py-3 bg-surface-hover text-ink font-bold rounded-xl hover:bg-border-hiyori transition-colors cursor-pointer"
                  >
                     Not now
                  </button>
                  <button
                     onClick={installUpdate}
                     className="flex-1 px-6 py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-hover transition-colors cursor-pointer"
                  >
                     Update now
                  </button>
               </div>
            </>
         )}

         {status === "downloading" && (
            <div className="flex flex-col items-center text-center py-4">
               <div className="w-10 h-10 border-4 border-border-hiyori border-t-brand rounded-full animate-spin mb-5" />
               <h3 id="updater-title" className="text-xl font-bold text-ink mb-2">Downloading update…</h3>
               <p className="text-ink-muted text-sm mb-5">Hiyori will restart automatically once it's ready.</p>
               <div className="w-full bg-page rounded-full h-2.5 border border-border-hiyori overflow-hidden">
                  <div
                     className="h-full bg-brand rounded-full transition-all duration-200"
                     style={{ width: progress >= 0 ? `${progress}%` : "40%" }}
                  />
               </div>
            </div>
         )}

         {status === "ready" && (
            <div className="flex flex-col items-center text-center py-4">
               <div className="w-10 h-10 border-4 border-border-hiyori border-t-brand rounded-full animate-spin mb-5" />
               <h3 id="updater-title" className="text-xl font-bold text-ink mb-2">Restarting Hiyori…</h3>
               <p className="text-ink-muted text-sm">The update is installed. This should only take a moment.</p>
            </div>
         )}

         {status === "error" && (
            <>
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-destructive-surface flex items-center justify-center">
                     <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <h3 id="updater-title" className="text-xl font-bold text-ink">Update failed</h3>
               </div>
               <p className="text-ink-muted mb-6">{error ?? "Something went wrong while updating Hiyori."}</p>
               <button
                  onClick={dismiss}
                  className="w-full px-6 py-3 bg-surface-hover text-ink font-bold rounded-xl hover:bg-border-hiyori transition-colors cursor-pointer"
               >
                  Close
               </button>
            </>
         )}
      </Modal>,
      document.body
   );
}
