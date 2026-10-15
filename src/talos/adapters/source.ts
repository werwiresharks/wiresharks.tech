import type { TalosEvent } from "../engine/events.ts";
import type { TalosEngine } from "../engine/engine.ts";

/**
 * The seam between the Talos Particle Engine and whatever produces events.
 *
 * The marketing site connects the simulated demo director. A real Talos
 * runtime would implement `TalosEventSource` over its own transport (for
 * example a WebSocket or server-sent event stream), mapping runtime messages
 * to `TalosEvent`s with stable ids and a monotonically increasing `seq`.
 * The engine validates ordering and transitions; it never trusts a source to
 * make authorization decisions, only to report them.
 */
export interface TalosEventSource {
  subscribe(listener: (event: TalosEvent) => void): () => void;
}

/** Pipe a source into an engine. Returns a disconnect function. */
export function connect(engine: TalosEngine, source: TalosEventSource) {
  return source.subscribe((event) => {
    engine.ingest(event);
  });
}

/**
 * Generic adapter for message-based transports: supply a parser that turns a
 * raw message into zero or more Talos events.
 */
export function createMessageSource<T>(
  attach: (onMessage: (message: T) => void) => () => void,
  parse: (message: T) => TalosEvent[],
): TalosEventSource {
  return {
    subscribe(listener) {
      return attach((message) => {
        for (const event of parse(message)) listener(event);
      });
    },
  };
}
