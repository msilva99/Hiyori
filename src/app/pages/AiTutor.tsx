import { useCallback, useEffect } from "react";
import { Navigate, Link } from "react-router";
import { motion } from "motion/react";
import { KeyRound, HardDriveDownload } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { useSettingsStore } from "../store/settingsStore";
import { useAiTutorStore } from "../store/aiTutorStore";
import { useAiTutorRunStore } from "../store/aiTutorRunStore";
import { useAiLocalServerStore } from "../store/aiLocalServerStore";
import { streamChat, type ChatTurn } from "../data/aiTutor/client";
import { AiTutorError, type ProviderConfig } from "../data/aiTutor/types";
import { byokProviderConfig, localProviderConfig, providerLabel } from "../data/aiTutor/models";
import { getApiKey } from "../data/aiTutor/secrets";
import { ConversationList } from "../components/aiTutor/ConversationList";
import { MessageThread } from "../components/aiTutor/MessageThread";
import { Composer } from "../components/aiTutor/Composer";

function createId() {
   return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Redirect to Settings unless the tutor is on and this is the desktop app.
export function AiTutorRoute() {
   const aiTutorMode = useSettingsStore((state) => state.aiTutorMode);
   if (!isTauri() || aiTutorMode === "off") return <Navigate to="/settings" replace />;
   return <AiTutor />;
}

export function AiTutor() {
   const hydrated = useAiTutorStore((s) => s.hydrated);

   const mode = useSettingsStore((s) => s.aiTutorMode);
   const byokProvider = useSettingsStore((s) => s.byokProvider);
   const byokModel = useSettingsStore((s) => s.byokModel);
   const byokKeySaved = useSettingsStore((s) => s.byokKeySaved);

   const conversations = useAiTutorStore((s) => s.conversations);
   const activeId = useAiTutorStore((s) => s.activeConversationId);

   const runStatus = useAiTutorRunStore((s) => s.status);
   const runStore = useAiTutorRunStore;

   const serverStatus = useAiLocalServerStore((s) => s.serverStatus);
   const refreshStatus = useAiLocalServerStore((s) => s.refreshStatus);

   useEffect(() => {
      if (mode === "local") void refreshStatus();
   }, [mode, refreshStatus]);

   const activeConversation = conversations.find((c) => c.id === activeId) ?? conversations[0] ?? null;

   const needsKey = mode === "byok" && !byokKeySaved;
   const needsModel = mode === "local" && serverStatus !== "running";
   const streaming = runStatus === "streaming";
   const canSend = hydrated && !needsKey && !needsModel;

   const resolveConfig = useCallback(async (): Promise<ProviderConfig> => {
      if (mode === "local") {
         const { serverStatus: status, port } = useAiLocalServerStore.getState();
         if (status !== "running" || !port) throw new AiTutorError("local_server", "Start the local model in Settings first.");
         return localProviderConfig(port);
      }
      const key = await getApiKey(byokProvider);
      if (!key) throw new AiTutorError("auth", "Add your API key in Settings.");
      return byokProviderConfig(byokProvider, byokModel, key);
   }, [mode, byokProvider, byokModel]);

   const send = useCallback(
      async (text: string) => {
         if (useAiTutorRunStore.getState().status === "streaming") return;

         const store = useAiTutorStore.getState();
         let conversationId = store.activeConversationId;
         if (!conversationId || !store.conversations.some((c) => c.id === conversationId)) {
            const label = mode === "local" ? "Local - gemma-4-e2b" : providerLabel(byokProvider, byokModel);
            conversationId = store.newConversation(label);
         }

         store.appendMessage(conversationId, {
            id: createId(),
            role: "user",
            content: text,
            createdAt: new Date().toISOString(),
         });

         let config: ProviderConfig;
         try {
            config = await resolveConfig();
         } catch (err) {
            useAiTutorRunStore.getState().fail(err instanceof Error ? err.message : "Couldn't start the tutor.");
            return;
         }

         const turns: ChatTurn[] = (
            useAiTutorStore.getState().conversations.find((c) => c.id === conversationId)?.messages ?? []
         ).map((m) => ({ role: m.role, content: m.content }));

         const controller = new AbortController();
         useAiTutorRunStore.getState().begin(conversationId, controller);

         try {
            await streamChat({
               turns,
               config,
               signal: controller.signal,
               callbacks: {
                  onText: (chunk) => useAiTutorRunStore.getState().pushDelta(chunk),
                  onDone: () => undefined,
               },
            });

            const aborted = controller.signal.aborted;
            const finalText = useAiTutorRunStore.getState().draft;
            useAiTutorRunStore.getState().finish();
            if (finalText.trim()) {
               useAiTutorStore.getState().appendMessage(conversationId, {
                  id: createId(),
                  role: "assistant",
                  content: finalText,
                  createdAt: new Date().toISOString(),
                  model: config.model,
                  incomplete: aborted || undefined,
               });
            }
         } catch (err) {
            const partial = useAiTutorRunStore.getState().draft;
            if (partial.trim()) {
               useAiTutorStore.getState().appendMessage(conversationId, {
                  id: createId(),
                  role: "assistant",
                  content: partial,
                  createdAt: new Date().toISOString(),
                  model: config.model,
                  incomplete: true,
               });
            }
            useAiTutorRunStore.getState().fail(err instanceof AiTutorError ? err.message : "The tutor hit an error.");
         }
      },
      [mode, byokProvider, byokModel, resolveConfig]
   );

   return (
      <div className="font-sans w-full">
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">AI Tutor</h1>
            <p className="mt-1 text-ink-muted">Japanese grammar, vocabulary, kanji, and usage.</p>
         </motion.div>

         {(needsKey || needsModel) && (
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border-hiyori bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
               <div className="flex items-start gap-3">
                  {needsKey ? (
                     <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  ) : (
                     <HardDriveDownload className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  )}
                  <p className="text-sm text-ink-muted">
                     {needsKey
                        ? "BYOK mode needs a provider API key before the tutor can answer."
                        : "Local mode needs its model downloaded and the server running."}
                  </p>
               </div>
               <Link
                  to="/settings"
                  className="shrink-0 rounded-xl bg-brand px-5 py-2.5 text-center font-bold text-white shadow-sm shadow-brand/20 transition-all hover:bg-brand-hover"
               >
                  Open Settings
               </Link>
            </div>
         )}

         <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
            <aside className="hidden rounded-2xl border border-border-hiyori bg-surface p-3 md:block md:h-[70vh]">
               <ConversationList />
            </aside>

            <section className="flex h-[70vh] flex-col rounded-2xl border border-border-hiyori bg-page/40 p-4">
               {!hydrated ? (
                  <div className="flex flex-1 items-center justify-center text-sm text-ink-muted">Loading…</div>
               ) : activeConversation ? (
                  <MessageThread conversation={activeConversation} />
               ) : (
                  <div className="flex flex-1 items-center justify-center text-center text-sm text-ink-muted">
                     Ask a question below to start your first conversation.
                  </div>
               )}

               <Composer
                  disabled={!canSend}
                  streaming={streaming}
                  onSend={send}
                  onStop={() => runStore.getState().stop()}
               />
            </section>
         </div>
      </div>
   );
}
