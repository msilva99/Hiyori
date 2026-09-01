import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { Markdown } from "./Markdown";
import { useAiTutorRunStore } from "../../store/aiTutorRunStore";
import type { AiTutorConversation } from "../../data/types";

export function MessageThread({ conversation }: { conversation: AiTutorConversation }) {
   const status = useAiTutorRunStore((s) => s.status);
   const draft = useAiTutorRunStore((s) => s.draft);
   const runConversationId = useAiTutorRunStore((s) => s.conversationId);
   const errorMessage = useAiTutorRunStore((s) => s.errorMessage);

   const here = runConversationId === conversation.id;
   const streamingHere = here && status === "streaming";
   const bottomRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      bottomRef.current?.scrollIntoView({ block: "end" });
   }, [conversation.messages.length, draft, streamingHere]);

   return (
      <div className="flex-1 space-y-4 overflow-y-auto px-1 py-4">
         {conversation.messages.length === 0 && !streamingHere && (
            <p className="py-10 text-center text-sm text-ink-muted">
               Ask a question about Japanese grammar, a word, or a kanji to get started.
            </p>
         )}

         {conversation.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
         ))}

         {streamingHere && (
            <div className="flex justify-start">
               <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-border-hiyori bg-surface px-4 py-3">
                  {draft ? (
                     <Markdown content={draft} />
                  ) : (
                     <span className="text-sm text-ink-faint">Thinking…</span>
                  )}
               </div>
            </div>
         )}

         {here && status === "error" && errorMessage && (
            <div className="rounded-xl border border-destructive/30 bg-destructive-surface px-4 py-3 text-sm text-destructive">
               {errorMessage}
            </div>
         )}

         <div ref={bottomRef} />
      </div>
   );
}
