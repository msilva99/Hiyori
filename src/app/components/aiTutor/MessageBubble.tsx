import { Markdown } from "./Markdown";
import type { AiTutorMessage } from "../../data/types";

export function MessageBubble({ message }: { message: AiTutorMessage }) {
   if (message.role === "user") {
      return (
         <div className="flex justify-end">
            <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand px-4 py-2.5 leading-relaxed text-white">
               {message.content}
            </div>
         </div>
      );
   }

   return (
      <div className="flex justify-start">
         <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-border-hiyori bg-surface px-4 py-3">
            <Markdown content={message.content} />
            {message.incomplete && <p className="mt-2 text-xs text-ink-faint">Stopped early.</p>}
            {message.error && (
               <p className="mt-2 text-xs text-destructive">This answer didn't finish generating.</p>
            )}
         </div>
      </div>
   );
}
