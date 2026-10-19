import type { RaptorEvent } from "./events.ts";
import { computeLayout, deriveEffects } from "./layout.ts";
import type { Effect, Layout } from "./layout.ts";
import { createModel, reduce } from "./model.ts";
import type { RaptorModel } from "./model.ts";
import { describeEvent } from "./describe.ts";

/**
 * Raptor Particle Engine facade.
 *
 * Owns the validated model and fans updates out to an optional view (the
 * WebGL renderer, loaded lazily) and to UI listeners. Everything here works
 * without WebGL, so status text and controls stay usable if rendering fails.
 */

export type RaptorView = {
  update(layout: Layout, model: RaptorModel, effects: Effect[]): void;
  dispose(): void;
};

export type IngestRecord = {
  event: RaptorEvent;
  accepted: boolean;
  reason?: string;
  description: string;
};

type Listener = (model: RaptorModel, record: IngestRecord | null) => void;

export class RaptorEngine {
  private state: RaptorModel = createModel();
  private view: RaptorView | null = null;
  private listeners = new Set<Listener>();

  get model() {
    return this.state;
  }

  /** Apply one event. Invalid or out-of-order events are reported, not thrown. */
  ingest(event: RaptorEvent): IngestRecord {
    const prev = this.state;
    const result = reduce(prev, event);
    const record: IngestRecord = {
      event,
      accepted: result.accepted,
      reason: result.accepted ? undefined : result.reason,
      description: describeEvent(event, prev),
    };
    if (result.accepted) {
      this.state = result.model;
      this.view?.update(
        computeLayout(this.state),
        this.state,
        deriveEffects(prev, this.state, event),
      );
    }
    this.listeners.forEach((listener) => listener(this.state, record));
    return record;
  }

  attach(view: RaptorView) {
    this.view?.dispose();
    this.view = view;
    view.update(computeLayout(this.state), this.state, []);
  }

  detach(view?: RaptorView) {
    if (view && view !== this.view) return;
    this.view?.dispose();
    this.view = null;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
