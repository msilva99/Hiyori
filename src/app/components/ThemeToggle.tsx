import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../store/themeStore";

export function ThemeToggle() {
  const { theme, toggle } = useThemeStore();

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-ink-muted hover:text-ink hover:bg-surface-hover transition-all cursor-pointer"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
    </button>
  );
}
