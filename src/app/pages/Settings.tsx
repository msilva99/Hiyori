import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { RefreshCw, DownloadCloud, CheckCircle2, AlertTriangle } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { cn } from "../../lib/utils";
import { useUpdaterStore } from "../store/updaterStore";

export function Settings() {
   const desktop = isTauri();
   const [currentVersion, setCurrentVersion] = useState<string | null>(null);
   const { status, error, checkForUpdates } = useUpdaterStore();

   useEffect(() => {
      if (!desktop) return;
      getVersion().then(setCurrentVersion);
   }, [desktop]);

   const isChecking = status === "checking";

   return (
      <div className="space-y-8 font-sans max-w-3xl mx-auto w-full pb-20">
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-extrabold text-ink tracking-tight">Settings</h1>
            <p className="text-ink-muted mt-2 text-lg">Manage your Hiyori app.</p>
         </motion.div>

         <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-surface border border-border-hiyori rounded-3xl shadow-sm p-6"
         >
            <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
               <DownloadCloud className="w-5 h-5 text-brand" /> Software Update
            </h2>

            {!desktop ? (
               <p className="text-ink-muted">Automatic updates are only available in the Hiyori desktop app.</p>
            ) : (
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                     <p className="text-ink font-medium">
                        {currentVersion ? `Version ${currentVersion}` : "Checking current version…"}
                     </p>
                     <div className="text-sm mt-1 flex items-center gap-1.5">
                        {status === "up-to-date" && (
                           <span className="text-success flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" /> You're up to date.
                           </span>
                        )}
                        {status === "error" && (
                           <span className="text-destructive flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4" /> {error ?? "Couldn't check for updates."}
                           </span>
                        )}
                        {(status === "idle" || status === "checking") && (
                           <span className="text-ink-muted">
                              {isChecking ? "Checking for updates…" : "Check for the latest version of Hiyori."}
                           </span>
                        )}
                        {(status === "available" || status === "downloading" || status === "ready") && (
                           <span className="text-brand">An update is on its way — see the dialog to continue.</span>
                        )}
                     </div>
                  </div>
                  <button
                     onClick={checkForUpdates}
                     disabled={isChecking}
                     className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all shadow-sm shadow-brand/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                  >
                     <RefreshCw className={cn("w-4 h-4", isChecking && "animate-spin")} />
                     {isChecking ? "Checking…" : "Check for Updates"}
                  </button>
               </div>
            )}
         </motion.div>
      </div>
   );
}
