import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { Sparkles, DownloadCloud } from "lucide-react";
import { Modal } from "./Modal";

// Demo-only: shown once per browser session (sessionStorage, not localStorage) so it
// reappears on a fresh visit but doesn't nag on every page navigation within one visit.
const DISMISSED_KEY = "hiyori-demo-notice-dismissed";

export function DemoModal() {
   const [isOpen, setIsOpen] = useState(false);

   useEffect(() => {
      try {
         if (!sessionStorage.getItem(DISMISSED_KEY)) {
            setIsOpen(true);
         }
      } catch {
         // Private browsing / blocked storage: fall back to showing it, no harm in that.
         setIsOpen(true);
      }
   }, []);

   const handleClose = () => {
      setIsOpen(false);
      try {
         sessionStorage.setItem(DISMISSED_KEY, "1");
      } catch {
         // Nothing to fall back to - worst case it shows again next navigation.
      }
   };

   if (!isOpen) return null;

   return createPortal(
      <Modal onClose={handleClose} titleId="demo-notice-title" className="max-w-md w-full p-8">
         <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center">
               <Sparkles className="w-5 h-5 text-brand" />
            </div>
            <h3 id="demo-notice-title" className="text-xl font-bold text-ink">You're viewing a live demo</h3>
         </div>
         <p className="text-ink-muted mb-4">
            This is a web demo of Hiyori, a free Japanese study app. Some features — like the AI tutor and the
            deck library — only exist in the desktop app.
         </p>
         <p className="text-ink-muted mb-6">
            Everything you do here stays in your browser and is free to explore, no account needed.
         </p>
         <div className="flex flex-col sm:flex-row gap-3">
            <Link
               to="/about"
               onClick={handleClose}
               className="flex-1 px-6 py-3 bg-surface-hover text-ink font-bold rounded-xl hover:bg-border-hiyori transition-colors cursor-pointer text-center"
            >
               Learn more
            </Link>
            <a
               href="https://github.com/msilva99/Hiyori/releases"
               target="_blank"
               rel="noreferrer"
               onClick={handleClose}
               className="flex-1 px-6 py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-hover transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
            >
               <DownloadCloud className="w-4 h-4" /> Get the app
            </a>
         </div>
      </Modal>,
      document.body
   );
}
