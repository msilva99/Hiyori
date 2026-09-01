import { useRef } from "react";
import { Link, useLocation } from "react-router";
import {
   Home,
   BookOpen,
   Layers,
   ClipboardCheck,
   Repeat,
   PenTool,
   BookA,
   BarChart2,
   Bot,
   Settings,
   HelpCircle,
   X
} from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { cn } from "../../lib/utils";
import { useFocusTrap } from "../../lib/useFocusTrap";
import { useSettingsStore } from "../store/settingsStore";
import iconT from "../../media/icon-t.png";

// Navigation is data-driven so future pages can be enabled or disabled in one place.
const navItems = [
{ name: "Home", path: "/", icon: Home },
{ name: "Decks", path: "/decks", icon: BookOpen },
{ name: "Study", path: "/study", icon: Layers },
{ name: "Test", path: "/test", icon: ClipboardCheck },
{ name: "Routines", path: "/routines", icon: Repeat },
{ name: "Journal", path: "/journal", icon: PenTool },
{ name: "Dictionary", path: "/dictionary", icon: BookA, disabled: true },
{ name: "Insights", path: "/insights", icon: BarChart2, disabled: true },
{ name: "AI Tutor", path: "/ai-tutor", icon: Bot },
];

function SidebarNav({ onClose }: { onClose?: () => void }) {
   const location = useLocation();
   const aiTutorMode = useSettingsStore((state) => state.aiTutorMode);
   // The AI Tutor is desktop-only and stays hidden until the user turns it on in Settings.
   const showAiTutor = isTauri() && aiTutorMode !== "off";
   const items = navItems.filter((item) => item.path !== "/ai-tutor" || showAiTutor);

   return (
      <>
         <div className="flex-1 min-h-0 overflow-y-auto">
             <div className="flex items-center gap-3 mb-10 px-2">
                <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center overflow-hidden shrink-0">
                   <img src={iconT} alt="Hiyori" className="w-full h-full object-cover p-2" />
                </div>
                <span className="text-2xl font-bold tracking-tight text-ink">Hiyori</span>
                {onClose && (
                   <button onClick={onClose} aria-label="Close menu" className="ml-auto p-2 text-ink-muted hover:text-ink hover:bg-surface-hover rounded-xl transition-colors cursor-pointer">
                      <X className="w-5 h-5" />
                   </button>
                )}
             </div>

            <nav className="space-y-2">
               {items.map((item) => {
                  const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
                  return (
                  <Link
                  key={item.name}
                  to={item.disabled ? "#" : item.path}
                  className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group relative",
                  isActive 
                  ? "bg-page text-brand font-medium" 
                  : item.disabled 
                  ? "text-ink-faint cursor-not-allowed opacity-60" 
                  : "text-ink-muted hover:bg-page hover:text-ink"
                  )}
                  onClick={(e) => {
                     if (item.disabled) {
                        e.preventDefault();
                     } else {
                        onClose?.();
                     }
                  }}
                  >
                  {isActive && (
                     <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand rounded-r-full" />
                     )}
                     <item.icon className={cn("w-5 h-5", isActive && "fill-brand/10")} strokeWidth={isActive ? 2.5 : 2} />
                     <span>{item.name}</span>
                     {item.disabled && (
                        <span className="ml-auto text-[10px] uppercase font-bold tracking-wider text-ink-faint bg-surface-hover px-2 py-0.5 rounded-full">
                           Soon
                        </span>
                        )}
                     </Link>
                     );
                  })}
               </nav>
            </div>

             <div className="shrink-0 space-y-2 pt-8 border-t border-border-hiyori">
                <Link
                   to="/settings"
                   onClick={() => onClose?.()}
                   className={cn(
                      "flex items-center gap-3 w-full px-4 py-3 rounded-2xl transition-all",
                      location.pathname === "/settings"
                         ? "bg-page text-brand font-medium"
                         : "text-ink-muted hover:bg-page hover:text-ink"
                   )}
                >
                   <Settings className="w-5 h-5" strokeWidth={2} />
                   <span>Settings</span>
                </Link>
                <button
                   disabled
                   className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-ink-faint opacity-60 cursor-not-allowed transition-all"
                >
                   <HelpCircle className="w-5 h-5" strokeWidth={2} />
                   <span>About</span>
                   <span className="ml-auto text-[10px] uppercase font-bold tracking-wider text-ink-faint bg-surface-hover px-2 py-0.5 rounded-full">
                      Soon
                   </span>
                </button>
             </div>
         </>
         );
      }

function MobileNavDrawer({ onClose }: { onClose: () => void }) {
   const asideRef = useRef<HTMLElement>(null);
   useFocusTrap(asideRef, onClose);

   return (
      <div className="xl:hidden fixed inset-0 z-50">
         <div className="fixed inset-0 bg-black/30" onClick={onClose} />
          <aside
             ref={asideRef}
             role="dialog"
             aria-modal="true"
             aria-label="Navigation menu"
             className="fixed top-0 left-0 w-70 h-screen bg-surface border-r border-border-hiyori flex flex-col py-8 px-6 shadow-lg z-10"
          >
             <SidebarNav onClose={onClose} />
         </aside>
      </div>
   );
}

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
   return (
   <>
      {/* Desktop: sticky sidebar in flex flow (exactly as before) */}
      <aside className="hidden xl:flex sticky top-0 w-70 h-screen bg-surface border-r border-border-hiyori flex-col py-8 px-6 shadow-sm z-10">
         <SidebarNav />
      </aside>

      {/* Mobile: fixed overlay drawer, mounted/unmounted so it can own its own focus trap */}
      {isOpen && <MobileNavDrawer onClose={onClose ?? (() => {})} />}
   </>
   );
}
