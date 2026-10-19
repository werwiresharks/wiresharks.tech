import type { RaptorEventSource } from "../adapters/source.ts";
import type { RaptorEvent, UnsequencedEvent } from "../engine/events.ts";
import { childrenOf, liveActions, rootAgent } from "../engine/model.ts";
import type { RaptorModel } from "../engine/model.ts";

/**
 * Simulated event producer for the website demonstration. It emits the same
 * typed events a Raptor runtime would, so the engine exercises real code
 * paths, but every event here is illustrative and generated in the browser.
 * The "policy layer" that approves or rejects is the visitor's button press.
 */

export type DemoCommand =
  | "idle"
  | "conversation"
  | "parallel"
  | "handoff"
  | "request"
  | "approve"
  | "reject"
  | "execute"
  | "complete"
  | "fail";

export type Narration = { who: "you" | "raptor" | "runtime"; text: string };

type Scheduler = {
  set(callback: () => void, ms: number): unknown;
  clear(handle: unknown): void;
};

const browserScheduler: Scheduler = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

const SUBAGENT_LABELS = ["Recon", "Dependency audit", "Patch draft", "Test run", "Report", "Review"];
const ACTIONS = [
  "Open a pull request with the dependency patch",
  "Run the integration suite against staging",
  "Rotate the exposed test credential",
  "Write findings to the shared report",
];
const AUTHORITY = "policy layer (simulated)";

export function availableCommands(model: RaptorModel): Record<DemoCommand, boolean> {
  const root = rootAgent(model);
  const actions = liveActions(model);
  const pending = actions.some((a) => a.state === "proposed" || a.state === "awaiting");
  const awaiting = actions.some((a) => a.state === "awaiting");
  const approved = actions.some((a) => a.state === "approved");
  const executing = actions.some((a) => a.state === "executing");
  const kids = root ? childrenOf(model, root.id) : [];
  const ready = !!root && !model.rollback;
  const busy = kids.length > 0 || executing || (!!root && root.state === "running");
  return {
    idle: true,
    conversation: ready,
    parallel: ready && kids.length < 6 && !pending,
    handoff: ready && !pending,
    request: ready && !pending && !approved && !executing,
    approve: ready && awaiting,
    reject: ready && awaiting,
    execute: ready && !pending && !executing,
    complete: ready && busy && !pending,
    fail: ready && !!model.checkpoint && !pending,
  };
}

export class DemoDirector implements RaptorEventSource {
  private seq = 0;
  private epoch = 0;
  private ids = 0;
  private timers = new Set<unknown>();
  private listeners = new Set<(event: RaptorEvent) => void>();
  private narrators = new Set<(line: Narration) => void>();
  private getModel: () => RaptorModel;
  private scheduler: Scheduler;

  constructor(getModel: () => RaptorModel, scheduler: Scheduler = browserScheduler) {
    this.getModel = getModel;
    this.scheduler = scheduler;
  }

  subscribe(listener: (event: RaptorEvent) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  onNarration(listener: (line: Narration) => void) {
    this.narrators.add(listener);
    return () => {
      this.narrators.delete(listener);
    };
  }

  private emit(event: UnsequencedEvent) {
    const sequenced = { ...event, seq: ++this.seq, at: Date.now() } as RaptorEvent;
    this.listeners.forEach((listener) => listener(sequenced));
  }

  private say(who: Narration["who"], text: string) {
    this.narrators.forEach((listener) => listener({ who, text }));
  }

  private later(ms: number, run: () => void) {
    const epoch = this.epoch;
    const handle = this.scheduler.set(() => {
      this.timers.delete(handle);
      if (epoch === this.epoch) run();
    }, ms);
    this.timers.add(handle);
  }

  private id(prefix: string) {
    return `${prefix}-${++this.ids}`;
  }

  /** Reset to a single idle primary agent with a saved checkpoint. */
  start() {
    this.epoch++;
    this.timers.forEach((handle) => this.scheduler.clear(handle));
    this.timers.clear();
    this.emit({ type: "session.reset" });
    this.emit({ type: "agent.spawned", agentId: this.id("raptor"), parentId: null, label: "Raptor" });
    this.emit({ type: "checkpoint.created", checkpointId: this.id("cp") });
  }

  run(command: DemoCommand) {
    const model = this.getModel();
    if (!availableCommands(model)[command]) return;
    const root = rootAgent(model);
    switch (command) {
      case "idle":
        this.start();
        this.say("runtime", "Session reset. One agent, idle.");
        return;

      case "conversation": {
        if (!root) return;
        if (model.mode === "conversation") {
          this.emit({ type: "conversation.closed" });
          return;
        }
        this.emit({ type: "conversation.opened" });
        this.say("you", "Audit the staging dependencies and patch what is safe to patch.");
        if (root.state === "idle") this.emit({ type: "agent.state", agentId: root.id, state: "proposing" });
        this.later(1500, () => {
          this.say("raptor", "Planning. I can split this into parallel reviews and ask before changing anything.");
          const current = rootAgent(this.getModel());
          if (current?.state === "proposing")
            this.emit({ type: "agent.state", agentId: current.id, state: "idle" });
        });
        return;
      }

      case "parallel": {
        if (!root) return;
        const existing = childrenOf(model, root.id).length;
        const count = Math.min(3, 6 - existing);
        this.emit({ type: "checkpoint.created", checkpointId: this.id("cp") });
        this.emit({ type: "agent.state", agentId: root.id, state: "running" });
        this.say("raptor", `Starting ${count} subagents in parallel.`);
        for (let i = 0; i < count; i++) {
          const agentId = this.id("sub");
          const label = SUBAGENT_LABELS[(existing + i) % SUBAGENT_LABELS.length];
          this.later(i * 260, () => {
            this.emit({ type: "agent.spawned", agentId, parentId: rootAgent(this.getModel())?.id ?? root.id, label });
            this.later(380, () => this.emit({ type: "agent.state", agentId, state: "proposing" }));
            this.later(1300 + i * 200, () => this.emit({ type: "agent.state", agentId, state: "running" }));
          });
        }
        return;
      }

      case "handoff": {
        if (!root) return;
        const toAgentId = this.id("raptor");
        this.emit({
          type: "agent.handoff",
          fromAgentId: root.id,
          toAgentId,
          label: `Raptor · generation ${root.generation + 1}`,
        });
        this.say("runtime", `Context handed to generation ${root.generation + 1}. Lineage preserved.`);
        return;
      }

      case "request": {
        if (!root) return;
        const kids = childrenOf(model, root.id);
        const agent = kids.find((kid) => kid.state === "running") ?? root;
        const actionId = this.id("act");
        const summary = ACTIONS[this.ids % ACTIONS.length];
        this.emit({ type: "action.proposed", actionId, agentId: agent.id, summary });
        this.emit({ type: "agent.state", agentId: agent.id, state: "proposing" });
        this.say("raptor", `Proposed: ${summary.toLowerCase()}.`);
        this.later(900, () => {
          this.emit({ type: "authorization.requested", actionId });
          this.emit({ type: "agent.state", agentId: agent.id, state: "awaiting" });
          this.say("runtime", "Held at the authority boundary until a decision is made.");
        });
        return;
      }

      case "approve":
      case "reject": {
        const action = liveActions(model).find((a) => a.state === "awaiting");
        if (!action) return;
        const decision = command === "approve" ? "approved" : "rejected";
        this.emit({ type: "authorization.resolved", actionId: action.id, decision, authority: AUTHORITY });
        this.say("runtime", decision === "approved" ? "Approved. The action may execute." : "Rejected. Nothing crosses the boundary.");
        if (decision === "approved")
          this.later(750, () => {
            this.emit({ type: "action.executing", actionId: action.id });
            this.emit({ type: "agent.state", agentId: action.agentId, state: "running" });
          });
        else this.emit({ type: "agent.state", agentId: action.agentId, state: "idle" });
        return;
      }

      case "execute": {
        const approved = liveActions(model).find((a) => a.state === "approved");
        if (approved) {
          this.emit({ type: "action.executing", actionId: approved.id });
          return;
        }
        for (const id of model.order) {
          const agent = model.agents[id];
          if (!agent.retired && agent.state !== "running")
            this.emit({ type: "agent.state", agentId: id, state: "running" });
        }
        this.say("raptor", "Executing the plan within current permissions.");
        return;
      }

      case "complete": {
        if (!root) return;
        for (const action of liveActions(model))
          if (action.state === "executing") this.emit({ type: "action.completed", actionId: action.id });
        const kids = childrenOf(model, root.id);
        kids.forEach((kid, i) => {
          this.later(i * 240, () => this.emit({ type: "agent.state", agentId: kid.id, state: "completed" }));
          this.later(750 + i * 240, () => this.emit({ type: "agent.reintegrated", agentId: kid.id }));
        });
        const settle = kids.length ? 900 + kids.length * 240 : 0;
        this.later(settle, () => {
          const current = rootAgent(this.getModel());
          if (!current) return;
          this.emit({ type: "agent.state", agentId: current.id, state: "completed" });
          this.say("raptor", "Done. Results are ready for review.");
          this.later(1400, () => this.emit({ type: "agent.state", agentId: current.id, state: "idle" }));
        });
        return;
      }

      case "fail": {
        if (!root || !model.checkpoint) return;
        const executing = liveActions(model).find((a) => a.state === "executing");
        const kids = childrenOf(model, root.id);
        const agentId = executing?.agentId ?? kids[0]?.id ?? root.id;
        if (executing) this.emit({ type: "action.failed", actionId: executing.id });
        if (model.agents[agentId].state !== "failed")
          this.emit({ type: "agent.state", agentId, state: "failed" });
        this.say("runtime", "Step failed. Rolling back to the last checkpoint.");
        const checkpointId = model.checkpoint.id;
        this.later(1200, () => this.emit({ type: "rollback.started", checkpointId }));
        this.later(2900, () => {
          this.emit({ type: "rollback.completed", checkpointId });
          this.say("runtime", "Restored. State matches the checkpoint.");
        });
        return;
      }
    }
  }

  dispose() {
    this.epoch++;
    this.timers.forEach((handle) => this.scheduler.clear(handle));
    this.timers.clear();
    this.listeners.clear();
    this.narrators.clear();
  }
}
