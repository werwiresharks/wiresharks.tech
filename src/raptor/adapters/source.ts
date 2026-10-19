import type { RaptorEvent } from "../engine/events.ts";
import type { RaptorEngine } from "../engine/engine.ts";

/**
 * The seam between the Raptor Particle Engine and whatever produces events.
 *
 * The marketing site connects the simulated demo director. A real Raptor
 * runtime would implement `RaptorEventSource` over its own transport (for
 * example a WebSocket or server-sent event stream), mapping runtime messages
 * to `RaptorEvent`s with stable ids and a monotonically increasing `seq`.
 * The engine validates ordering and transitions; it never trusts a source to
 * make authorization decisions, only to report them.
 */
export interface RaptorEventSource {
  subscribe(listener: (event: RaptorEvent) => void): () => void;
}

/** Pipe a source into an engine. Returns a disconnect function. */
export function connect(engine: RaptorEngine, source: RaptorEventSource) {
  return source.subscribe((event) => {
    engine.ingest(event);
  });
}

/**
 * Generic adapter for message-based transports: supply a parser that turns a
 * raw message into zero or more Raptor events.
 */
export function createMessageSource<T>(
  attach: (onMessage: (message: T) => void) => () => void,
  parse: (message: T) => RaptorEvent[],
): RaptorEventSource {
  return {
    subscribe(listener) {
      return attach((message) => {
        for (const event of parse(message)) listener(event);
      });
    },
  };
}
