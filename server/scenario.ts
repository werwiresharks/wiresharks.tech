import type { UnsequencedEvent } from "../src/raptor/engine/events.ts";
import type { SessionLog } from "./log.ts";

/**
 * A deterministic, illustrative Raptor session: an authorized dependency
 * review that scopes, spawns parallel workers, proposes an action, has it
 * authorized by a policy layer, executes, checkpoints, and folds back. Every
 * cycle opens with `session.reset` so a client joining mid-stream gets a clean,
 * self-contained boundary. These events are a demonstration; a real runtime
 * would produce its own.
 */
export type ScenarioStep = { delayMs: number; event: UnsequencedEvent };

const AUTHORITY = "policy layer";

export const REVIEW_SESSION: ScenarioStep[] = [
  { delayMs: 0, event: { type: "session.reset" } },
  { delayMs: 300, event: { type: "agent.spawned", agentId: "raptor", parentId: null, label: "Raptor" } },
  { delayMs: 500, event: { type: "agent.state", agentId: "raptor", state: "running" } },
  { delayMs: 400, event: { type: "checkpoint.created", checkpointId: "cp-1" } },
  { delayMs: 500, event: { type: "agent.spawned", agentId: "recon", parentId: "raptor", label: "Recon" } },
  { delayMs: 300, event: { type: "agent.spawned", agentId: "audit", parentId: "raptor", label: "Dependency audit" } },
  { delayMs: 400, event: { type: "agent.state", agentId: "recon", state: "running" } },
  { delayMs: 400, event: { type: "agent.state", agentId: "audit", state: "running" } },
  { delayMs: 700, event: { type: "action.proposed", actionId: "pr-1", agentId: "audit", summary: "Open a pull request with the dependency patch" } },
  { delayMs: 500, event: { type: "authorization.requested", actionId: "pr-1" } },
  { delayMs: 900, event: { type: "authorization.resolved", actionId: "pr-1", decision: "approved", authority: AUTHORITY } },
  { delayMs: 500, event: { type: "action.executing", actionId: "pr-1" } },
  { delayMs: 900, event: { type: "action.completed", actionId: "pr-1" } },
  { delayMs: 500, event: { type: "agent.state", agentId: "audit", state: "completed" } },
  { delayMs: 300, event: { type: "agent.reintegrated", agentId: "audit" } },
  { delayMs: 500, event: { type: "agent.state", agentId: "recon", state: "completed" } },
  { delayMs: 300, event: { type: "agent.reintegrated", agentId: "recon" } },
  { delayMs: 500, event: { type: "agent.state", agentId: "raptor", state: "completed" } },
];

type Scheduler = {
  set(callback: () => void, ms: number): unknown;
  clear(handle: unknown): void;
};

const nodeScheduler: Scheduler = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * Play a scenario into a log. Loops by default, pausing `restMs` between runs.
 * Returns a stop function. Appends that the reducer rejects are skipped, so a
 * malformed scenario degrades rather than wedging the stream.
 */
export function playScenario(
  log: SessionLog,
  options: {
    steps?: ScenarioStep[];
    scheduler?: Scheduler;
    loop?: boolean;
    restMs?: number;
  } = {},
): () => void {
  const steps = options.steps ?? REVIEW_SESSION;
  const scheduler = options.scheduler ?? nodeScheduler;
  const loop = options.loop ?? true;
  const restMs = options.restMs ?? 2500;

  let stopped = false;
  let handle: unknown = null;
  let index = 0;

  const tick = () => {
    if (stopped) return;
    if (index >= steps.length) {
      if (!loop) return;
      index = 0;
      handle = scheduler.set(run, restMs);
      return;
    }
    log.append(steps[index].event);
    index += 1;
    handle = scheduler.set(run, steps[index]?.delayMs ?? restMs);
  };

  const run = () => {
    handle = null;
    tick();
  };

  // First step fires immediately so a fresh log is never empty.
  handle = scheduler.set(run, steps[0]?.delayMs ?? 0);

  return () => {
    stopped = true;
    if (handle !== null) scheduler.clear(handle);
  };
}
