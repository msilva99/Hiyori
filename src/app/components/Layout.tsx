import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { UpdaterModal } from "./UpdaterModal";
import { AiTutorOnboardingModal } from "./AiTutorOnboardingModal";
import { useUpdaterStore } from "../store/updaterStore";

export function Layout() {
   const [sidebarOpen, setSidebarOpen] = useState(false);
   const checkForUpdates = useUpdaterStore((state) => state.checkForUpdates);

   useEffect(() => {
      // Silent: this is a no-op on the web build, and it only surfaces UI (via UpdaterModal)
      // when an update is actually found - see updaterStore's hasSurfaced flag.
      checkForUpdates();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   return (
   <div className="flex w-full min-h-screen bg-page font-sans text-ink">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 relative flex justify-center bg-page">
         <div className="w-full max-w-5xl px-4 md:px-8 py-6 md:py-10 pb-20">
            <button
            onClick={() => setSidebarOpen(true)}
            className="xl:hidden inline-flex items-center gap-2 mb-6 px-3 py-2 rounded-xl text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer"
            aria-label="Open navigation menu"
            >
            <Menu className="w-5 h-5" />
            <span className="text-sm font-medium">Menu</span>
            </button>
            <Outlet />
         </div>
      </main>
      <UpdaterModal />
      <AiTutorOnboardingModal />
   </div>
   );
}
