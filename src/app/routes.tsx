import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Decks } from "./pages/Decks";
import { DeckDetail } from "./pages/DeckDetail";
import { DeckStudy } from "./pages/DeckStudy";
import { StudySettings } from "./pages/StudySettings";
import { StudySession } from "./pages/StudySession";
import { Test } from "./pages/Test";
import { Routines } from "./pages/Routines";
import { KanaPractice } from "./pages/KanaPractice";
import { Journal } from "./pages/Journal";
import { Dictionary } from "./pages/Dictionary";
import { Settings } from "./pages/Settings";

// tmp playground
import { DecksStorePlayground } from "./pages/DecksStorePlayground";

export const router = createBrowserRouter([
   {
      path: "/",
      Component: Layout,
      children: [
         // These pages render inside Layout's <Outlet />.
         { index: true, Component: Home },
         { path: "decks", Component: Decks },
         { path: "decks/:id", Component: DeckDetail },
         { path: "decks/:id/study", Component: DeckStudy },
         { path: "study", Component: StudySettings },
         { path: "study/session", Component: StudySession },
         { path: "test", Component: Test },
         { path: "routines", Component: Routines },
         { path: "kana", Component: KanaPractice },
         { path: "journal", Component: Journal },
         { path: "dictionary", Component: Dictionary },
         { path: "settings", Component: Settings },
         // These future pages are intentionally placeholders and are disabled in the sidebar.
         { path: "insights", Component: () => <div className="p-8"><h1 className="text-2xl font-bold text-ink">Insights</h1><p className="mt-4 text-ink-muted">Coming soon!</p></div> },
         { path: "ai-tutor", Component: () => <div className="p-8"><h1 className="text-2xl font-bold text-ink">AI Tutor</h1><p className="mt-4 text-ink-muted">Coming soon!</p></div> },

         // tmp playground
         { path: "store-playground", Component: DecksStorePlayground },
      ],
   },
]);
