import { createParser, type EventSourceMessage } from "eventsource-parser";

export type SseHandlers = {
   signal?: AbortSignal;
   onEvent: (evt: { data: string; event?: string }) => void;
};

// Reads a Server-Sent Events response body to completion, handing each parsed frame
// to onEvent. Aborting the signal stops the read on the next chunk boundary.
export async function readSse(response: Response, { signal, onEvent }: SseHandlers): Promise<void> {
   if (!response.body) throw new Error("Streaming response had no body.");

   const parser = createParser({
      onEvent: (event: EventSourceMessage) => onEvent({ data: event.data, event: event.event }),
   });

   const reader = response.body.getReader();
   const decoder = new TextDecoder();

   try {
      for (;;) {
         if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
         const { done, value } = await reader.read();
         if (done) break;
         parser.feed(decoder.decode(value, { stream: true }));
      }
   } finally {
      reader.releaseLock();
   }
}
