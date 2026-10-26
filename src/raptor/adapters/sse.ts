import type { RaptorEvent } from "../engine/events.ts";
import type { RaptorEventSource } from "./source.ts";
import { parseMessage } from "./wire.ts";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting";

/**
 * A {@link RaptorEventSource} over the browser `EventSource` (Server-Sent
 * Events). `EventSource` owns reconnection and resends `Last-Event-ID`, so the
 * server replays exactly what was missed; this adapter only validates each
 * message at the boundary and drops stale or duplicate sequence numbers.
 *
 * Pairs with the SSE server in `server/`. For a raw socket with manual
 * reconnection instead, use `createStreamSource` from `./stream.ts`.
 */
export function createEventSourceSource(
  url: string,
  eventName = "raptor",
  onStatus?: (status: ConnectionStatus) => void,
): RaptorEventSource & { close(): void } {
  const listeners = new Set<(event: RaptorEvent) => void>();
  let es: EventSource | null = null;
  let lastSeq = -1;

  const onMessage = (ev: MessageEvent) => {
    for (const event of parseMessage(ev.data)) {
      if (event.seq <= lastSeq) continue;
      lastSeq = event.seq;
      for (const listener of listeners) listener(event);
    }
  };

  const open = () => {
    if (es) return;
    onStatus?.("connecting");
    es = new EventSource(url);
    es.addEventListener(eventName, onMessage);
    es.addEventListener("open", onOpen);
    es.addEventListener("error", onError);
  };

  const onOpen = () => onStatus?.("connected");
  const onError = () => onStatus?.("reconnecting");

  const teardown = () => {
    es?.removeEventListener(eventName, onMessage);
    es?.removeEventListener("open", onOpen);
    es?.removeEventListener("error", onError);
    es?.close();
    es = null;
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) open();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) teardown();
      };
    },
    close: teardown,
  };
}
