import { create } from "zustand";

type RunStatus = "idle" | "streaming" | "error";

type AiTutorRunStore = {
   status: RunStatus;
   conversationId: string | null;
   // Streamed assistant text so far. Updated at most once per animation frame, so
   // rendering it (markdown included) on every change is safe.
   draft: string;
   errorMessage: string | null;
   abort: AbortController | null;

   begin: (conversationId: string, abort: AbortController) => void;
   pushDelta: (chunk: string) => void;
   finish: () => void;
   fail: (message: string) => void;
   stop: () => void;
   reset: () => void;
};

// Deliberately not persisted: an in-flight stream must not survive a reload, and the
// per-token buffer would thrash any persistent storage. Completed messages are moved
// into the persisted aiTutorStore by the page.
export const useAiTutorRunStore = create<AiTutorRunStore>((set, get) => {
   let pending = "";
   let raf: number | null = null;

   const cancelRaf = () => {
      if (raf !== null) {
         cancelAnimationFrame(raf);
         raf = null;
      }
   };

   const flushPending = () => {
      if (!pending) return;
      const chunk = pending;
      pending = "";
      set((state) => ({ draft: state.draft + chunk }));
   };

   const onFrame = () => {
      raf = null;
      flushPending();
   };

   return {
      status: "idle",
      conversationId: null,
      draft: "",
      errorMessage: null,
      abort: null,

      begin: (conversationId, abort) => {
         cancelRaf();
         pending = "";
         set({ status: "streaming", conversationId, draft: "", errorMessage: null, abort });
      },

      pushDelta: (chunk) => {
         if (get().status !== "streaming" || !chunk) return;
         pending += chunk;
         if (raf === null) raf = requestAnimationFrame(onFrame);
      },

      finish: () => {
         cancelRaf();
         flushPending();
         set({ status: "idle", abort: null });
      },

      fail: (message) => {
         cancelRaf();
         pending = "";
         set({ status: "error", errorMessage: message, abort: null });
      },

      stop: () => {
         get().abort?.abort();
         cancelRaf();
         flushPending();
         set({ status: "idle", abort: null });
      },

      reset: () => {
         cancelRaf();
         pending = "";
         set({ status: "idle", conversationId: null, draft: "", errorMessage: null, abort: null });
      },
   };
});
