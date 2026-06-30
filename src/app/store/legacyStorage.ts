import type { HiyoriData } from "../data/types";

const LEGACY_STORAGE_KEY = "hiyori-data";

export function loadLegacyHiyoriData(): HiyoriData | null {
   if (typeof localStorage === "undefined") {
      return null;
   }

   const savedData = localStorage.getItem(LEGACY_STORAGE_KEY);

   if (!savedData) {
      return null;
   }

   try {
      return JSON.parse(savedData) as HiyoriData;
   } catch {
      return null;
   }
}
