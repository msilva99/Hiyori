import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { del as idbDel, get as idbGet, set as idbSet } from "idb-keyval";
import type { AiTutorConversation, AiTutorMessage } from "../data/types";

function createId() {
   return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function titleFrom(text: string): string {
   const clean = text.trim().replace(/\s+/g, " ");
   if (!clean) return "New chat";
   // Japanese has no word spacing, so just clip at a character budget.
   return clean.length > 40 ? `${clean.slice(0, 40)}…` : clean;
}

type AiTutorStore = {
   conversations: AiTutorConversation[];
   activeConversationId: string | null;
   // Flips true once the IndexedDB-backed state has finished loading.
   hydrated: boolean;

   newConversation: (providerLabel?: string) => string;
   deleteConversation: (id: string) => void;
   renameConversation: (id: string, title: string) => void;
   setActiveConversation: (id: string | null) => void;
   // Only completed messages land here - the live stream lives in aiTutorRunStore -
   // so persistence fires once per message, never per token.
   appendMessage: (conversationId: string, message: AiTutorMessage) => void;

   exportJSON: () => string;
   importJSON: (text: string) => { added: number };
};

// IndexedDB rather than localStorage: chat history would otherwise share the ~5 MB
// origin budget with decks / journal / study log and silently fail on overflow.
const idbStorage = {
   getItem: (name: string): Promise<string | null> => idbGet<string>(name).then((value) => value ?? null),
   setItem: (name: string, value: string): Promise<void> => idbSet(name, value),
   removeItem: (name: string): Promise<void> => idbDel(name),
};

export const useAiTutorStore = create<AiTutorStore>()(
   persist(
      (set, get) => ({
         conversations: [],
         activeConversationId: null,
         hydrated: false,

         newConversation: (providerLabel) => {
            // Don't pile up blank chats: if the newest one is still empty, reuse it.
            const newest = get().conversations[0];
            if (newest && newest.messages.length === 0) {
               set((state) => ({
                  activeConversationId: newest.id,
                  conversations: state.conversations.map((c) =>
                     c.id === newest.id ? { ...c, providerLabel: providerLabel ?? c.providerLabel } : c
                  ),
               }));
               return newest.id;
            }

            const now = new Date().toISOString();
            const conversation: AiTutorConversation = {
               id: createId(),
               title: "New chat",
               messages: [],
               createdAt: now,
               updatedAt: now,
               providerLabel,
            };
            set((state) => ({
               conversations: [conversation, ...state.conversations],
               activeConversationId: conversation.id,
            }));
            return conversation.id;
         },

         deleteConversation: (id) => {
            set((state) => {
               const conversations = state.conversations.filter((c) => c.id !== id);
               const activeConversationId =
                  state.activeConversationId === id
                     ? conversations[0]?.id ?? null
                     : state.activeConversationId;
               return { conversations, activeConversationId };
            });
         },

         renameConversation: (id, title) => {
            const clean = title.trim();
            if (!clean) return;
            set((state) => ({
               conversations: state.conversations.map((c) =>
                  c.id === id ? { ...c, title: clean, updatedAt: new Date().toISOString() } : c
               ),
            }));
         },

         setActiveConversation: (activeConversationId) => set({ activeConversationId }),

         appendMessage: (conversationId, message) => {
            set((state) => ({
               conversations: state.conversations.map((c) => {
                  if (c.id !== conversationId) return c;
                  const firstUserMessage = c.messages.length === 0 && message.role === "user";
                  return {
                     ...c,
                     messages: [...c.messages, message],
                     title: firstUserMessage ? titleFrom(message.content) : c.title,
                     updatedAt: message.createdAt,
                  };
               }),
            }));
         },

         exportJSON: () =>
            JSON.stringify({ schema: "hiyori-ai-tutor", version: 1, conversations: get().conversations }, null, 2),

         importJSON: (text) => {
            const parsed = JSON.parse(text) as {
               schema?: string;
               conversations?: AiTutorConversation[];
            };
            if (parsed.schema !== "hiyori-ai-tutor" || !Array.isArray(parsed.conversations)) {
               throw new Error("This file is not a Hiyori AI Tutor export.");
            }
            const known = new Set(get().conversations.map((c) => c.id));
            const incoming = parsed.conversations.filter(
               (c) => c && typeof c.id === "string" && !known.has(c.id)
            );
            set((state) => ({
               conversations: [...incoming, ...state.conversations].sort((a, b) =>
                  b.updatedAt.localeCompare(a.updatedAt)
               ),
            }));
            return { added: incoming.length };
         },
      }),
      {
         name: "hiyori-ai-tutor",
         version: 1,
         storage: createJSONStorage(() => idbStorage),
         partialize: (state) => ({
            conversations: state.conversations,
            activeConversationId: state.activeConversationId,
         }),
         onRehydrateStorage: () => () => {
            useAiTutorStore.setState({ hydrated: true });
         },
      }
   )
);
