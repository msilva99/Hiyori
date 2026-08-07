import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
   "a[href]",
   "button:not([disabled])",
   "input:not([disabled])",
   "select:not([disabled])",
   "textarea:not([disabled])",
   '[tabindex]:not([tabindex="-1"])',
].join(", ");

function getFocusableElements(container: HTMLElement) {
   return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

// Traps focus inside an overlay for its whole mounted lifetime. Overlays in this app are
// conditionally rendered (e.g. `{deleteConfirm && <Modal .../>}`), so mount/unmount already
// models open/close — the hook only needs to run once per mount, not react to prop changes.
// `onClose` should just be a plain state setter; it's captured once and never needs to be fresh.
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, onClose: () => void) {
   useEffect(() => {
      const container = containerRef.current;

      if (!container) {
         return;
      }

      const previouslyFocusedElement = document.activeElement as HTMLElement | null;
      const [firstFocusable] = getFocusableElements(container);
      firstFocusable?.focus();

      const handleKeyDown = (event: KeyboardEvent) => {
         if (event.key === "Escape") {
            event.preventDefault();
            onClose();
            return;
         }

         if (event.key !== "Tab") {
            return;
         }

         const focusable = getFocusableElements(container);

         if (focusable.length === 0) {
            event.preventDefault();
            return;
         }

         // Always take over Tab ourselves: default browser tabbing would happily walk into
         // the page content behind this overlay, which is still very much in the DOM.
         event.preventDefault();
         const lastIndex = focusable.length - 1;
         const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
         const nextIndex = event.shiftKey
            ? currentIndex <= 0 ? lastIndex : currentIndex - 1
            : currentIndex === -1 || currentIndex === lastIndex ? 0 : currentIndex + 1;

         focusable[nextIndex].focus();
      };

      document.addEventListener("keydown", handleKeyDown);

      return () => {
         document.removeEventListener("keydown", handleKeyDown);

         if (previouslyFocusedElement && document.contains(previouslyFocusedElement)) {
            previouslyFocusedElement.focus();
         }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);
}
