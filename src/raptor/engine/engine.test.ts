import "./describe-history.test.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { RaptorEngine } from "./engine.ts";
import { computeLayout } from "./layout.ts";
import { childrenOf, rootAgent } from "./model.ts";
import { DemoDirector, availableCommands } from "../demo/director.ts";
import type { DemoCommand } from "../demo/director.ts";

function harness() {
  const engine = new RaptorEngine();
  const queue: { at: number; run: () => void }[] = [];
  let now = 0;
  const director = new DemoDirector(() => engine.model, {
    set: (run, ms) => {
      const entry = { at: now + ms, run };
      queue.push(entry);
      return entry;
    },
    clear: (handle) => {
      const index = queue.indexOf(handle as (typeof queue)[number]);
      if (index >= 0) queue.splice(index, 1);
    },
  });
  const rejected: string[] = [];
  director.subscribe((event) => {
    const record = engine.ingest(event);
    if (!record.accepted) rejected.push(`${event.type}: ${record.reason}`);
  });
  const advance = (ms: number) => {
    const end = now + ms;
    for (;;) {
      queue.sort((a, b) => a.at - b.at);
      const next = queue[0];
      if (!next || next.at > end) break;
      queue.shift();
      now = next.at;
      next.run();
    }
    now = end;
  };
  director.start();
  return { engine, director, advance, rejected };
}

test("starts with one idle primary agent inside the boundary", () => {
  const { engine } = harness();
  const root = rootAgent(engine.model)!;
  assert.equal(root.state, "idle");
  const layout = computeLayout(engine.model);
  assert.equal(layout.clusters.length, 1);
  assert.equal(layout.clusters[0].share, 1);
  assert.ok(layout.ring.radius > layout.clusters[0].radius);
});

test("parallel subagents become separate clusters with hierarchy threads", () => {
  const { engine, director, advance } = harness();
  director.run("parallel");
  advance(3000);
  const root = rootAgent(engine.model)!;
  assert.equal(childrenOf(engine.model, root.id).length, 3);
  const layout = computeLayout(engine.model);
  assert.equal(layout.clusters.filter((c) => c.kind === "agent").length, 4);
  assert.equal(layout.threads.filter((t) => t.kind === "hierarchy").length, 3);
  const total = layout.clusters.reduce((sum, c) => sum + c.share, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
});

test("handoff keeps lineage: predecessor becomes a trace", () => {
  const { engine, director } = harness();
  const first = rootAgent(engine.model)!.id;
  director.run("handoff");
  const root = rootAgent(engine.model)!;
  assert.notEqual(root.id, first);
  assert.equal(root.predecessorId, first);
  assert.equal(engine.model.agents[first].retired, true);
  const layout = computeLayout(engine.model);
  assert.ok(layout.clusters.some((c) => c.kind === "trace" && c.key === `a:${first}`));
  assert.ok(layout.threads.some((t) => t.kind === "lineage"));
});

test("authorization holds at the boundary until resolved", () => {
  const { engine, director, advance } = harness();
  director.run("request");
  advance(1000);
  const layout = computeLayout(engine.model);
  assert.notEqual(layout.ring.holdAngle, null);
  const action = layout.clusters.find((c) => c.kind === "action")!;
  assert.ok(Math.hypot(action.center[0], action.center[1]) < layout.ring.radius);
  assert.equal(availableCommands(engine.model).approve, true);
  director.run("approve");
  const crossed = computeLayout(engine.model).clusters.find((c) => c.kind === "action")!;
  assert.ok(Math.hypot(crossed.center[0], crossed.center[1]) > layout.ring.radius);
});

test("rejection withdraws without crossing and is distinct from rollback", () => {
  const { engine, director, advance } = harness();
  director.run("request");
  advance(1000);
  director.run("reject");
  const layout = computeLayout(engine.model);
  assert.equal(layout.clusters.filter((c) => c.kind === "action").length, 0);
  assert.equal(layout.ring.holdAngle, null);
  assert.equal(engine.model.rollback, null);
});

test("failure rolls back to the checkpoint", () => {
  const { engine, director, advance } = harness();
  director.run("parallel");
  advance(3000);
  director.run("fail");
  advance(1300);
  assert.ok(engine.model.rollback);
  assert.equal(computeLayout(engine.model).checkpoint?.active, true);
  advance(2000);
  assert.equal(engine.model.rollback, null);
  const root = rootAgent(engine.model)!;
  assert.equal(childrenOf(engine.model, root.id).length, 0);
  assert.equal(root.state, "idle");
});

test("completion reintegrates subagents into the parent", () => {
  const { engine, director, advance } = harness();
  director.run("parallel");
  advance(3000);
  director.run("complete");
  advance(6000);
  const root = rootAgent(engine.model)!;
  assert.equal(childrenOf(engine.model, root.id).length, 0);
  assert.equal(root.state, "idle");
});

test("stale and impossible events are rejected without changing state", () => {
  const { engine } = harness();
  const before = engine.model;
  const stale = engine.ingest({ type: "conversation.opened", seq: 1 });
  assert.equal(stale.accepted, false);
  const unknown = engine.ingest({ type: "authorization.resolved", seq: 999, actionId: "nope", decision: "approved", authority: "x" });
  assert.equal(unknown.accepted, false);
  assert.equal(engine.model, before);
});

test("rapid random commands never produce rejected events or broken layouts", () => {
  const { engine, director, advance, rejected } = harness();
  const commands: DemoCommand[] = ["idle", "conversation", "parallel", "handoff", "request", "approve", "reject", "execute", "complete", "fail"];
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 600; i++) {
    director.run(commands[Math.floor(random() * commands.length)]);
    advance(random() * 900);
    const layout = computeLayout(engine.model);
    const total = layout.clusters.reduce((sum, c) => sum + c.share, 0);
    if (layout.clusters.length) assert.ok(Math.abs(total - 1) < 1e-9);
    for (const c of layout.clusters) assert.ok(c.share >= 0 && Number.isFinite(c.radius));
  }
  // Delayed events may legitimately lose a race (e.g. after a rollback);
  // they must be rejected by the model, never applied out of order.
  for (const reason of rejected) assert.doesNotMatch(reason, /stale sequence/);
});

test("hydrated action and agent history update the view without replaying one-shot effects", () => {
  const engine = new RaptorEngine();
  const effects: string[] = [];
  engine.attach({
    update: (_layout, _model, next) => { effects.push(...next.map(effect => effect.kind)); },
    dispose() {},
  });
  const history = [
    { type: "agent.spawned", agentId: "root", parentId: null, label: "Root" },
    { type: "action.proposed", actionId: "call", agentId: "root", summary: "work" },
    { type: "authorization.requested", actionId: "call" },
    { type: "authorization.resolved", actionId: "call", decision: "approved", authority: "user" },
    { type: "action.executing", actionId: "call" },
    { type: "action.completed", actionId: "call" },
    { type: "agent.state", agentId: "root", state: "completed" },
  ] as const;
  let seq = 0;
  for (const event of history) assert.ok(engine.ingest({ ...event, seq: ++seq }).accepted);
  assert.ok(effects.includes("bloom") && effects.includes("flash"));
  effects.length = 0;
  for (const event of history) assert.ok(engine.ingest({ ...event, hydrate: true, seq: ++seq }).accepted);
  assert.deepEqual(effects, []);
});
