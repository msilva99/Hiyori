import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { RefreshCw, DownloadCloud, CheckCircle2, AlertTriangle, Sun, Moon, Contrast, ChevronDown, Check } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { cn } from "../../lib/utils";
import { useUpdaterStore } from "../store/updaterStore";
import { useThemeStore, type Theme } from "../store/themeStore";

const THEME_OPTIONS: { value: Theme; label: string; description: string; icon: typeof Sun }[] = [
   { value: "light", label: "Light", description: "The default look.", icon: Sun },
   { value: "dark", label: "Dark", description: "Easier on the eyes in low light.", icon: Moon },
   { value: "high-contrast", label: "High Contrast", description: "Darker text and buttons for stronger contrast.", icon: Contrast },
];

function ThemeSelect({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
   const [isOpen, setIsOpen] = useState(false);
   const containerRef = useRef<HTMLDivElement>(null);
   const activeOption = THEME_OPTIONS.find((option) => option.value === theme) ?? THEME_OPTIONS[0];

   // Same outside-click/Escape pattern as the Journal history popover: document
   // listeners instead of a full-viewport overlay, so there's no extra node for
   // a screen reader to navigate around when the menu is closed.
   useEffect(() => {
      if (!isOpen) return;

      const handlePointerDown = (event: MouseEvent) => {
         if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            setIsOpen(false);
         }
      };

      const handleKeyDown = (event: KeyboardEvent) => {
         if (event.key === "Escape") {
            setIsOpen(false);
         }
      };

      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);

      return () => {
         document.removeEventListener("mousedown", handlePointerDown);
         document.removeEventListener("keydown", handleKeyDown);
      };
   }, [isOpen]);

   return (
      <div className="relative shrink-0" ref={containerRef}>
         <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border-hiyori bg-page text-ink font-bold focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer min-w-44 justify-between transition-colors hover:bg-surface-hover"
         >
            <span className="flex items-center gap-2">
               <activeOption.icon className="w-4 h-4 text-brand" /> {activeOption.label}
            </span>
            <ChevronDown className={cn("w-4 h-4 text-ink-muted transition-transform", isOpen && "rotate-180")} />
         </button>

         {isOpen && (
            <div
               role="listbox"
               aria-label="Theme"
               className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border-hiyori shadow-xl rounded-2xl z-30 overflow-hidden py-1"
            >
               {THEME_OPTIONS.map((option) => {
                  const isSelected = option.value === theme;
                  return (
                     <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                           onChange(option.value);
                           setIsOpen(false);
                        }}
                        className={cn(
                           "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left cursor-pointer",
                           isSelected ? "bg-brand-surface text-brand" : "text-ink hover:bg-page"
                        )}
                     >
                        <option.icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{option.label}</span>
                        {isSelected && <Check className="w-4 h-4 shrink-0" />}
                     </button>
                  );
               })}
            </div>
         )}
      </div>
   );
}

export function Settings() {
   const desktop = isTauri();
   const [currentVersion, setCurrentVersion] = useState<string | null>(null);
   const { status, error, checkForUpdates } = useUpdaterStore();
   const { theme, setTheme } = useThemeStore();
   const activeThemeOption = THEME_OPTIONS.find((option) => option.value === theme) ?? THEME_OPTIONS[0];

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
               <activeThemeOption.icon className="w-5 h-5 text-brand" /> Appearance
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <div>
                  <p className="text-ink font-medium">Theme</p>
                  <p className="text-sm text-ink-muted mt-1">{activeThemeOption.description}</p>
               </div>
               <ThemeSelect theme={theme} onChange={setTheme} />
            </div>
         </motion.div>

         <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
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
