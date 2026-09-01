import { useRef, useState, type KeyboardEvent } from "react";
import { Send, Square } from "lucide-react";

type ComposerProps = {
   disabled: boolean;
   streaming: boolean;
   onSend: (text: string) => void;
   onStop: () => void;
};

export function Composer({ disabled, streaming, onSend, onStop }: ComposerProps) {
   const [value, setValue] = useState("");
   const ref = useRef<HTMLTextAreaElement>(null);

   const submit = () => {
      const text = value.trim();
      if (!text || disabled || streaming) return;
      onSend(text);
      setValue("");
      if (ref.current) ref.current.style.height = "auto";
   };

   const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
         event.preventDefault();
         submit();
      }
   };

   return (
      <div className="flex items-end gap-2 border-t border-border-hiyori pt-3">
         <textarea
            ref={ref}
            value={value}
            rows={1}
            onChange={(event) => {
               setValue(event.target.value);
               event.target.style.height = "auto";
               event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask about grammar, a word, a kanji…"
            className="max-h-40 flex-1 resize-none rounded-xl border border-border-hiyori bg-page px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-brand"
         />
         {streaming ? (
            <button
               type="button"
               onClick={onStop}
               className="flex shrink-0 items-center gap-2 rounded-xl bg-surface-hover px-4 py-3 font-bold text-ink transition-colors hover:bg-border-hiyori"
            >
               <Square className="h-4 w-4 fill-current" /> Stop
            </button>
         ) : (
            <button
               type="button"
               onClick={submit}
               disabled={disabled || !value.trim()}
               className="flex shrink-0 items-center justify-center rounded-xl bg-brand p-3 text-white shadow-sm shadow-brand/20 transition-all hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
               aria-label="Send"
            >
               <Send className="h-5 w-5" />
            </button>
         )}
      </div>
   );
}
