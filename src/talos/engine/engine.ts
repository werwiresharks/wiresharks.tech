import type { TalosEvent } from "./events.ts";
import { computeLayout, deriveEffects } from "./layout.ts";
import type { Effect, Layout } from "./layout.ts";
import { createModel, reduce } from "./model.ts";
import type { TalosModel } from "./model.ts";
import { describeEvent } from "./describe.ts";

/**
 * Talos Particle Engine facade.
 *
 * Owns the validated model and fans updates out to an optional view (the
 * WebGL renderer, loaded lazily) and to UI listeners. Everything here works
 * without WebGL, so status text and controls stay usable if rendering fails.
 */

export type TalosView = {
  update(layout: Layout, model: TalosModel, effects: Effect[]): void;
  dispose(): void;
};

export type IngestRecord = {
  event: TalosEvent;
  accepted: boolean;
  reason?: string;
  description: string;
};

type Listener = (model: TalosModel, record: IngestRecord | null) => void;

export class TalosEngine {
  private state: TalosModel = createModel();
  private view: TalosView | null = null;
  private listeners = new Set<Listener>();

  get model() {
    return this.state;
  }

  /** Apply one event. Invalid or out-of-order events are reported, not thrown. */
  ingest(event: TalosEvent): IngestRecord {
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

  attach(view: TalosView) {
    this.view?.dispose();
    this.view = view;
    view.update(computeLayout(this.state), this.state, []);
  }

  detach(view?: TalosView) {
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
