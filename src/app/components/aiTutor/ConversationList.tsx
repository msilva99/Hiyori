import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useAiTutorStore } from "../../store/aiTutorStore";

export function ConversationList({ onPick }: { onPick?: () => void }) {
   const conversations = useAiTutorStore((s) => s.conversations);
   const activeId = useAiTutorStore((s) => s.activeConversationId);
   const newConversation = useAiTutorStore((s) => s.newConversation);
   const deleteConversation = useAiTutorStore((s) => s.deleteConversation);
   const renameConversation = useAiTutorStore((s) => s.renameConversation);
   const setActiveConversation = useAiTutorStore((s) => s.setActiveConversation);

   const [editingId, setEditingId] = useState<string | null>(null);
   const [draftTitle, setDraftTitle] = useState("");

   const commitRename = () => {
      if (editingId) renameConversation(editingId, draftTitle);
      setEditingId(null);
   };

   return (
      <div className="flex h-full flex-col">
         <button
            type="button"
            onClick={() => {
               newConversation();
               onPick?.();
            }}
            className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 font-bold text-white shadow-sm shadow-brand/20 transition-all hover:bg-brand-hover"
         >
            <Plus className="h-4 w-4" /> New chat
         </button>

         <div className="flex-1 space-y-1 overflow-y-auto">
            {conversations.length === 0 && (
               <p className="px-2 py-4 text-sm text-ink-muted">No conversations yet.</p>
            )}
            {conversations.map((conversation) => (
               <div
                  key={conversation.id}
                  className={cn(
                     "group flex items-center gap-2 rounded-xl px-3 py-2 transition-colors",
                     conversation.id === activeId ? "bg-page text-brand" : "text-ink-muted hover:bg-page hover:text-ink"
                  )}
               >
                  {editingId === conversation.id ? (
                     <input
                        autoFocus
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(event) => {
                           if (event.key === "Enter") commitRename();
                           if (event.key === "Escape") setEditingId(null);
                        }}
                        className="min-w-0 flex-1 rounded-md border border-border-hiyori bg-surface px-2 py-1 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                     />
                  ) : (
                     <button
                        type="button"
                        onClick={() => {
                           setActiveConversation(conversation.id);
                           onPick?.();
                        }}
                        onDoubleClick={() => {
                           setEditingId(conversation.id);
                           setDraftTitle(conversation.title);
                        }}
                        className="min-w-0 flex-1 truncate text-left text-sm"
                        title={conversation.title}
                     >
                        {conversation.title}
                     </button>
                  )}
                  <button
                     type="button"
                     onClick={() => deleteConversation(conversation.id)}
                     className="shrink-0 rounded-md p-1 text-ink-faint opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                     aria-label="Delete conversation"
                  >
                     <Trash2 className="h-4 w-4" />
                  </button>
               </div>
            ))}
         </div>
      </div>
   );
}
