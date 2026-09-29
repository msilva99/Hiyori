import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export type SelectOption<T> = {
   value: T;
   label: string;
   icon?: LucideIcon;
};

type SelectProps<T> = {
   value: T;
   onChange: (value: T) => void;
   options: SelectOption<T>[];
   ariaLabel: string;
   className?: string;
   menuClassName?: string;
   // Overrides the outer positioning wrapper's classes (default "relative shrink-0") -
   // needed when the trigger itself must grow/shrink as a flex child (e.g. flex-1),
   // since that wrapper - not the button - is the actual flex item in the parent row.
   wrapperClassName?: string;
   // Sizes the menu to the trigger's own width instead of the default w-56 - for
   // compact/narrow triggers (e.g. inside a small popover) where a fixed 14rem menu
   // would look oversized relative to what it's attached to.
   matchTriggerWidth?: boolean;
};

// Shared dropdown so every page gets the same look (and the same keyboard/outside-click
// behavior) instead of a plain native <select>, which the browser renders with its own
// unstyled popup that can't be made to match the rest of the app. T is unconstrained
// (not just string) since a couple of call sites key off numbers instead - only strict
// equality and rendering as a React key are needed, both of which work for any primitive.
//
// The menu is portaled to document.body and positioned from the trigger's own
// getBoundingClientRect rather than living in-flow under the trigger - an ancestor
// with overflow-hidden (e.g. a rounded card, common throughout this app) would
// otherwise clip an in-flow absolutely-positioned menu at the ancestor's edge.
export function Select<T>({
   value,
   onChange,
   options,
   ariaLabel,
   className,
   menuClassName,
   wrapperClassName,
   matchTriggerWidth,
}: SelectProps<T>) {
   const [isOpen, setIsOpen] = useState(false);
   const [menuStyle, setMenuStyle] = useState<{ top: number; right: number; width?: number }>({ top: 0, right: 0 });
   const containerRef = useRef<HTMLDivElement>(null);
   const buttonRef = useRef<HTMLButtonElement>(null);
   const activeOption = options.find((option) => option.value === value) ?? options[0];

   const updateMenuPosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      setMenuStyle({
         top: rect.bottom + 8,
         right: window.innerWidth - rect.right,
         width: matchTriggerWidth ? rect.width : undefined,
      });
   };

   useLayoutEffect(() => {
      if (!isOpen) return;

      updateMenuPosition();

      const handlePointerDown = (event: MouseEvent) => {
         if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            setIsOpen(false);
         }
      };

      const handleKeyDown = (event: KeyboardEvent) => {
         if (event.key === "Escape") {
            setIsOpen(false);
         }
      };

      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);
      window.addEventListener("scroll", updateMenuPosition, true);
      window.addEventListener("resize", updateMenuPosition);

      return () => {
         document.removeEventListener("mousedown", handlePointerDown);
         document.removeEventListener("keydown", handleKeyDown);
         window.removeEventListener("scroll", updateMenuPosition, true);
         window.removeEventListener("resize", updateMenuPosition);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isOpen]);

   return (
      <div className={cn("relative shrink-0", wrapperClassName)} ref={containerRef}>
         <button
            ref={buttonRef}
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            className={cn(
               "flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-hiyori bg-page text-ink font-bold focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer justify-between transition-colors hover:bg-surface-hover",
               className
            )}
         >
            <span className="flex items-center gap-2 truncate">
               {activeOption?.icon && <activeOption.icon className="w-4 h-4 text-brand shrink-0" />}
               {activeOption?.label}
            </span>
            <ChevronDown className={cn("w-4 h-4 text-ink-muted transition-transform shrink-0", isOpen && "rotate-180")} />
         </button>

         {isOpen &&
            createPortal(
               <div
                  role="listbox"
                  aria-label={ariaLabel}
                  style={{ position: "fixed", top: menuStyle.top, right: menuStyle.right, width: menuStyle.width }}
                  className={cn(
                     // Portaled to document.body, so this only needs to beat the app's
                     // other highest z-index (50, used by Modal/toasts) - not whatever
                     // z-index the trigger's own ancestors happen to use.
                     "w-56 bg-surface border border-border-hiyori shadow-xl rounded-2xl z-[60] overflow-hidden py-1",
                     menuClassName
                  )}
               >
                  {options.map((option) => {
                     const isSelected = option.value === value;
                     return (
                        <button
                           key={String(option.value)}
                           type="button"
                           role="option"
                           aria-selected={isSelected}
                           onClick={() => {
                              onChange(option.value);
                              setIsOpen(false);
                           }}
                           className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left cursor-pointer",
                              isSelected ? "bg-brand-surface text-brand" : "text-ink hover:bg-page"
                           )}
                        >
                           {option.icon && <option.icon className="w-4 h-4 shrink-0" />}
                           <span className="flex-1 truncate">{option.label}</span>
                           {isSelected && <Check className="w-4 h-4 shrink-0" />}
                        </button>
                     );
                  })}
               </div>,
               document.body
            )}
      </div>
   );
}
