import type { Finding } from "./findings.ts";
import { readMapped } from "./map.ts";
import type { RepoMap } from "./map.ts";
import type { Scope } from "./scope.ts";
import type { UnsequencedEvent } from "../src/raptor/engine/events.ts";

/**
 * A specialized investigation agent and the registry the orchestrator discovers
 * them through.
 *
 * The product vision is a swarm: the orchestrator splits an objective into jobs
 * for specialized workers, they run in parallel, and their findings combine into
 * one report. This is the seam that makes that real and pluggable — a worker is
 * any object with a capability and a `run`; the orchestrator never hard-codes
 * which workers exist, it asks the registry which ones *apply* to the repository
 * in front of it (capability discovery) and dispatches those.
 *
 * Every worker is read-only and scope-bound by construction. Its only door to
 * the filesystem is `WorkerContext.read`, which refuses any path the Scope has
 * not already mapped — a permission enforced in code here, not a rule a model is
 * asked to respect. A worker cannot write, execute, or reach outside the Scope.
 */
export interface WorkerContext {
  scope: Scope;
  map: RepoMap;
  /** Read a mapped file. Rejects for any path outside the in-scope set. */
  read(relPath: string): Promise<string>;
  /** The engine agent id the orchestrator spawned for this worker. */
  agentId: string;
  /** Narrate progress in the engine's event vocabulary. */
  emit(event: UnsequencedEvent): void;
  /** Aborts when the assessment is cancelled or this task times out. */
  signal: AbortSignal;
}

export interface WorkerResult {
  findings: Finding[];
  notes: string[];
}

export interface InvestigationWorker {
  /** Stable capability id the orchestrator dispatches by. */
  readonly capability: string;
  /** Short human title for the report and narration. */
  readonly title: string;
  /** One sentence on what this worker looks for. */
  readonly description: string;
  /** True when this worker has something to do on the given map. */
  applicableTo(map: RepoMap): boolean;
  run(ctx: WorkerContext): Promise<WorkerResult>;
}

/** The public face of a worker, for capability discovery without running it. */
export interface WorkerCapability {
  capability: string;
  title: string;
  description: string;
}

/**
 * Build a read-only, scope-checked reader for a worker. Even though `map.files`
 * is already the in-scope set, the reader re-checks membership on every call:
 * the permission is enforced independently of whatever path a worker (or a model
 * driving one) asks for.
 */
export function scopedReader(map: RepoMap): (relPath: string) => Promise<string> {
  const allowed = new Set(map.files);
  return async (relPath: string) => {
    if (!allowed.has(relPath)) {
      throw new Error(`denied: ${relPath} is not an in-scope file`);
    }
    return readMapped(map, relPath);
  };
}

/** A registry of workers, keyed by capability, with capability discovery. */
export class WorkerRegistry {
  private workers = new Map<string, InvestigationWorker>();

  /** Register a worker. A later registration of the same capability replaces it. */
  register(worker: InvestigationWorker): this {
    this.workers.set(worker.capability, worker);
    return this;
  }

  get(capability: string): InvestigationWorker | undefined {
    return this.workers.get(capability);
  }

  list(): InvestigationWorker[] {
    return [...this.workers.values()];
  }

  /** Every registered worker's public capability — discovery without running. */
  capabilities(): WorkerCapability[] {
    return this.list().map((w) => ({
      capability: w.capability,
      title: w.title,
      description: w.description,
    }));
  }

  /** The workers that have something to do on this map, in registration order. */
  applicable(map: RepoMap): InvestigationWorker[] {
    return this.list().filter((w) => w.applicableTo(map));
  }
}
