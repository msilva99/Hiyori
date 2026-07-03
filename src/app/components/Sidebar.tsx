import { Link, useLocation } from "react-router";
import { 
   Home, 
   BookOpen, 
   PenTool, 
   BookA,
   BarChart2, 
   Bot, 
   Settings,
   HelpCircle,
   X
} from "lucide-react";
import { cn } from "../../lib/utils";
import { ThemeToggle } from "./ThemeToggle";

// Navigation is data-driven so future pages can be enabled or disabled in one place.
const navItems = [
{ name: "Home", path: "/", icon: Home },
{ name: "Decks", path: "/decks", icon: BookOpen },
{ name: "Journal", path: "/journal", icon: PenTool },
{ name: "Dictionary", path: "/dictionary", icon: BookA, disabled: true },
{ name: "Insights", path: "/insights", icon: BarChart2, disabled: true },
{ name: "AI Tutor", path: "/ai-tutor", icon: Bot, disabled: true },
];

function SidebarNav({ onClose }: { onClose?: () => void }) {
   const location = useLocation();

   return (
      <>
         <div>
             <div className="flex items-center gap-3 mb-10 px-2">
                <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm overflow-hidden">
                   🦊
                </div>
                <span className="text-2xl font-bold tracking-tight text-ink">Hiyori</span>
                {onClose && (
                   <button onClick={onClose} className="ml-auto p-2 text-ink-muted hover:text-ink hover:bg-surface-hover rounded-xl transition-colors cursor-pointer">
                      <X className="w-5 h-5" />
                   </button>
                )}
             </div>

            <nav className="space-y-2">
               {navItems.map((item) => {
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

             <div className="space-y-2 pt-8 border-t border-border-hiyori">
                <ThemeToggle />
                <button
                   disabled
                   className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-ink-faint opacity-60 cursor-not-allowed transition-all"
                >
                   <Settings className="w-5 h-5" strokeWidth={2} />
                   <span>Settings</span>
                   <span className="ml-auto text-[10px] uppercase font-bold tracking-wider text-ink-faint bg-surface-hover px-2 py-0.5 rounded-full">
                      Soon
                   </span>
                </button>
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

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
   return (
   <>
      {/* Desktop: sticky sidebar in flex flow (exactly as before) */}
      <aside className="hidden xl:flex sticky top-0 w-70 h-screen bg-surface border-r border-border-hiyori flex-col justify-between py-8 px-6 shadow-sm z-10">
         <SidebarNav />
      </aside>

      {/* Mobile: fixed overlay drawer */}
      {isOpen && (
         <div className="xl:hidden fixed inset-0 z-50">
            <div className="fixed inset-0 bg-black/30" onClick={onClose} />
             <aside className="fixed top-0 left-0 w-70 h-screen bg-surface border-r border-border-hiyori flex flex-col justify-between py-8 px-6 shadow-lg z-10">
                <SidebarNav onClose={onClose} />
            </aside>
         </div>
      )}
   </>
   );
}
