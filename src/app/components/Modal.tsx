import { useRef, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { useFocusTrap } from "../../lib/useFocusTrap";

type ModalProps = {
   onClose: () => void;
   children: ReactNode;
   className?: string;
   titleId?: string;
};

export function Modal({ onClose, children, className, titleId }: ModalProps) {
   const containerRef = useRef<HTMLDivElement>(null);
   useFocusTrap(containerRef, onClose);

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
         <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
            className={cn("bg-surface rounded-3xl shadow-xl border border-border-hiyori", className)}
         >
            {children}
         </motion.div>
      </div>
   );
}
