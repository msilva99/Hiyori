import { useState } from "react";
import { Outlet } from "react-router";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";

export function Layout() {
   const [sidebarOpen, setSidebarOpen] = useState(false);

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
   </div>
   );
}
