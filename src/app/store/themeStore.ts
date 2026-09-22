import { create } from "zustand";

export type Theme = "light" | "dark" | "high-contrast";

const THEME_CLASSES: Record<Theme, string | null> = {
   light: null,
   dark: "dark",
   "high-contrast": "high-contrast",
};

interface ThemeState {
   theme: Theme;
   setTheme: (theme: Theme) => void;
}

function getInitialTheme(): Theme {
   if (typeof window === "undefined") return "light";
   const stored = localStorage.getItem("hiyori-theme") as Theme | null;
   if (stored === "light" || stored === "dark" || stored === "high-contrast") return stored;
   return "light";
}

function applyTheme(theme: Theme) {
   // Only one theme class (or none, for plain light) is ever active at a time.
   document.documentElement.classList.remove("dark", "high-contrast");
   const themeClass = THEME_CLASSES[theme];
   if (themeClass) {
      document.documentElement.classList.add(themeClass);
   }
   localStorage.setItem("hiyori-theme", theme);
}

const initial = getInitialTheme();
applyTheme(initial);

export const useThemeStore = create<ThemeState>((set) => ({
   theme: initial,
   setTheme: (theme) =>
      set(() => {
         applyTheme(theme);
         return { theme };
      }),
}));
