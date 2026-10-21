import { createModel, reduce } from "../src/raptor/engine/model.ts";
import type { RaptorModel } from "../src/raptor/engine/model.ts";
import type { RaptorEvent, UnsequencedEvent } from "../src/raptor/engine/events.ts";

/**
 * The authoritative event log for one Raptor session.
 *
 * It owns the same validated model the browser engine runs, so it can only
 * ever emit events the client will accept: `append` assigns the next sequence
 * number and runs the reducer, rejecting anything out of order or impossible
 * before it reaches a client. A bounded ring keeps the recent tail for replay.
 *
 * `catchUp` serves two kinds of subscriber: a fresh client (no last id) gets
 * the stream from the most recent `session.reset`, which is self-contained and
 * reducible from an empty model; a reconnecting client gets only what it
 * missed after its last seen sequence.
 */
export class SessionLog {
  private state: RaptorModel = createModel();
  private events: RaptorEvent[] = [];
  private readonly max: number;
  private readonly listeners = new Set<(event: RaptorEvent) => void>();

  constructor(max = 500) {
    this.max = Math.max(1, max);
  }

  get snapshot(): RaptorModel {
    return this.state;
  }

  get lastSeq(): number {
    return this.state.seq;
  }

  /**
   * Append one event, assigning the next sequence number. Returns the stored
   * event, or `null` if the reducer rejected it (the log is left unchanged).
   */
  append(event: UnsequencedEvent): RaptorEvent | null {
    const full = { ...event, seq: this.state.seq + 1 } as RaptorEvent;
    const result = reduce(this.state, full);
    if (!result.accepted) return null;
    this.state = result.model;
    this.events.push(full);
    if (this.events.length > this.max) this.events.shift();
    for (const listener of this.listeners) listener(full);
    return full;
  }

  /** Events a subscriber should receive before the live stream begins. */
  catchUp(lastEventId: number | null): RaptorEvent[] {
    if (lastEventId !== null && lastEventId > 0) {
      return this.events.filter((event) => event.seq > lastEventId);
    }
    // Fresh client: start at the last session boundary so the stream reduces
    // cleanly from an empty model.
    let start = 0;
    for (let i = this.events.length - 1; i >= 0; i--) {
      if (this.events[i].type === "session.reset") {
        start = i;
        break;
      }
    }
    return this.events.slice(start);
  }

  subscribe(listener: (event: RaptorEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
