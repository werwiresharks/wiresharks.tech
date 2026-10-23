import { test } from "node:test";
import assert from "node:assert/strict";
import { RaptorEngine } from "./engine.ts";
import type { UnsequencedEvent } from "./events.ts";
import { ParticleField } from "./particles.ts";
import { Substrate } from "./substrate.ts";

const CAPACITY = 2400;
function scene(attached = true) {
  const engine = new RaptorEngine();
  const field = new ParticleField(CAPACITY);
  const substrate = new Substrate(field.lattice, CAPACITY);
  substrate.setAnchors({ primary: { x: 400, y: 500, radius: 42 }, overflow: { x: 400, y: 200, radius: 18 } });
  let seq = 0;
  const attach = () => engine.attach({ update: (_layout, model) => substrate.sync(model), dispose() {} });
  if (attached) attach();
  const send = (event: UnsequencedEvent) => {
    const result = engine.ingest({ ...event, seq: ++seq });
    assert.ok(result.accepted, `${event.type}: ${result.reason}`);
  };
  const spawn = (id: string, parentId: string | null = "root", hydrate = false) =>
    send({ type: "agent.spawned", agentId: id, parentId, label: id, hydrate });
  const step = (seconds: number) => {
    for (let i = 0; i < Math.ceil(seconds * 60); i++) substrate.step(1 / 60, false);
  };
  const conserved = () => {
    const snap = substrate.snapshot();
    assert.equal(snap.inFlight + snap.unowned + snap.bodies.reduce((n, b) => n + b.resident, 0), CAPACITY);
  };
  return { engine, field, substrate, attach, send, spawn, step, conserved };
}

test("a real reset clears every old body and flight before a new session is populated", () => {
  const s = scene();
  s.spawn("root", null);
  s.spawn("child");
  assert.ok(s.substrate.snapshot().inFlight > 0);
  s.send({ type: "session.reset" });
  assert.deepEqual(s.substrate.snapshot(), { bodies: [], inFlight: 0, unowned: CAPACITY });
  s.spawn("next", null);
  assert.deepEqual(s.substrate.snapshot(), { bodies: [{ agentId: "next", phase: "resident", resident: CAPACITY }], inFlight: 0, unowned: 0 });
  s.step(5);
  s.conserved();
});

for (const attached of [true, false]) test(`hydrated history is still with renderer attached ${attached ? "before" : "after"} replay`, () => {
  const s = scene(attached);
  s.spawn("root", null, true);
  s.spawn("old", "root", true);
  if (attached) assert.equal(s.substrate.snapshot().inFlight, 0);
  s.send({ type: "agent.reintegrated", agentId: "old", hydrate: true });
  s.spawn("live", "root", true);
  s.spawn("nested", "live", true);
  if (!attached) s.attach();
  const snap = s.substrate.snapshot();
  assert.equal(snap.inFlight, 0);
  assert.deepEqual(snap.bodies.map(b => b.agentId), ["root", "live", "nested"]);
  assert.ok(snap.bodies.every(b => b.resident > 0));
  s.conserved();
});

test("hydrated duplicates preserve identities, decisions, and settled particle ownership", () => {
  const s = scene();
  s.spawn("root", null);
  s.spawn("child");
  s.send({ type: "conversation.opened" });
  s.send({ type: "agent.state", agentId: "child", state: "running" });
  s.send({ type: "action.proposed", actionId: "a", agentId: "child", summary: "work" });
  s.send({ type: "authorization.requested", actionId: "a" });
  s.send({ type: "authorization.resolved", actionId: "a", decision: "approved", authority: "user" });
  s.step(4);
  const owner = Int16Array.from(s.substrate.owner);
  const spawnedSeq = s.engine.model.agents.child.spawnedSeq;
  s.spawn("child", "root", true);
  s.send({ type: "conversation.opened", hydrate: true });
  s.send({ type: "agent.state", agentId: "child", state: "running", hydrate: true });
  s.send({ type: "agent.activity", agentId: "child", activity: "listening", hydrate: true });
  s.send({ type: "action.proposed", actionId: "a", agentId: "child", summary: "work", hydrate: true });
  assert.equal(s.engine.model.agents.child.spawnedSeq, spawnedSeq);
  assert.equal(s.engine.model.actions.a.state, "approved");
  assert.deepEqual(s.substrate.owner, owner);
  assert.equal(s.substrate.snapshot().inFlight, 0);
  assert.equal(s.engine.ingest({ type: "agent.spawned", agentId: "child", parentId: null, label: "wrong", hydrate: true, seq: 1e6 }).accepted, false);
  assert.equal(s.engine.ingest({ type: "action.proposed", actionId: "a", agentId: "root", summary: "wrong", hydrate: true, seq: 1e6 }).accepted, false);
  assert.equal(s.engine.ingest({ type: "agent.spawned", agentId: "child", parentId: "root", label: "child", seq: 1e6 }).accepted, false);
});

test("withdrawing one pending or decided action leaves other actions and live agents intact", () => {
  const s = scene();
  s.spawn("root", null);
  s.spawn("child");
  for (const id of ["pending", "decided", "other"]) s.send({ type: "action.proposed", actionId: id, agentId: "child", summary: id });
  s.send({ type: "authorization.requested", actionId: "pending" });
  s.send({ type: "authorization.requested", actionId: "decided" });
  s.send({ type: "authorization.resolved", actionId: "decided", decision: "rejected", authority: "user" });
  s.step(4);
  const before = s.substrate.snapshot();
  s.send({ type: "action.withdrawn", actionId: "pending" });
  s.send({ type: "action.withdrawn", actionId: "decided" });
  assert.deepEqual(Object.keys(s.engine.model.actions), ["other"]);
  assert.deepEqual(s.substrate.snapshot(), before);
});

test("a returning child that reappears reclaims its return cohort and stays present", () => {
  const s = scene();
  s.spawn("root", null);
  s.spawn("child");
  s.step(4);
  const before = Int16Array.from(s.substrate.owner);
  s.send({ type: "agent.reintegrated", agentId: "child" });
  s.step(0.4);
  s.spawn("child");
  s.step(6);
  assert.deepEqual(s.substrate.owner, before);
  assert.deepEqual(s.substrate.snapshot().bodies.map(b => [b.agentId, b.phase]), [["root", "resident"], ["child", "resident"]]);
  s.conserved();
});

test("nested births and an accepted transfer wait for the parent's inbound cohort", () => {
  const s = scene();
  s.spawn("root", null);
  s.spawn("a");
  s.spawn("b", "a");
  s.send({ type: "transfer", transferId: "early", kind: "peer", fromAgentId: "b", toAgentId: "a", disposition: "delivered" });
  let moved = 0;
  let before = Int16Array.from(s.substrate.owner);
  for (let frame = 0; frame < 1200; frame++) {
    s.step(1 / 60);
    for (let i = 0; i < CAPACITY; i++) if (before[i] === 2 && s.substrate.owner[i] === 1) moved++;
    before = Int16Array.from(s.substrate.owner);
    s.conserved();
  }
  assert.ok(s.substrate.snapshot().bodies.every(b => b.resident > 0));
  assert.equal(moved, 48, "the queued transfer was assigned exactly one cohort after birth");
});

test("sustained one-way peer traffic replenishes sources and drains every accepted queued message", () => {
  const s = scene();
  s.spawn("root", null);
  s.spawn("a");
  s.spawn("b");
  s.step(4);
  let moved = 0;
  let before = Int16Array.from(s.substrate.owner);
  const measure = () => {
    for (let i = 0; i < CAPACITY; i++) if (before[i] === 1 && s.substrate.owner[i] === 2) moved++;
    before = Int16Array.from(s.substrate.owner);
    s.conserved();
  };
  for (let n = 0; n < 40; n++) {
    s.send({ type: "transfer", transferId: `peer-${n}`, kind: "peer", fromAgentId: "a", toAgentId: "b", disposition: "delivered" });
    measure();
  }
  for (let frame = 0; frame < 12000; frame++) {
    s.step(1 / 60);
    measure();
  }
  assert.equal(moved, 40 * 48, "even transfers older than the model's recent window eventually fly once");
  assert.ok(s.substrate.snapshot().bodies.every(b => b.resident >= 24));
  assert.equal(s.substrate.snapshot().inFlight, 0);
});

for (const radius of [42, 18]) test(`awaiting authority holds actual particle positions at radius ${radius}`, () => {
  const s = scene();
  s.substrate.setAnchors({ primary: { x: 400, y: 300, radius } });
  s.spawn("root", null);
  s.send({ type: "agent.state", agentId: "root", state: "awaiting" });
  s.step(3);
  s.substrate.write(s.field, 800, 600, 4);
  const before = Float32Array.from(s.field.position);
  s.step(5);
  s.substrate.write(s.field, 800, 600, 4);
  assert.deepEqual(s.field.position, before);
});

test("returning particles fade continuously into a dock's final density", () => {
  const s = scene();
  s.substrate.setAnchors({ primary: { x: 120, y: 560, radius: 18 }, overflow: { x: 120, y: 300, radius: 18 } });
  s.spawn("root", null);
  s.spawn("child");
  s.step(4);
  s.send({ type: "agent.reintegrated", agentId: "child" });
  const cohort = Array.from(s.substrate.flightOf, (f, i) => f >= 0 ? i : -1).filter(i => i >= 0);
  const previous = new Float32Array(CAPACITY);
  let maximum = 0;
  for (let frame = 0; frame < 300; frame++) {
    s.step(1 / 60);
    s.substrate.write(s.field, 800, 600, 4);
    for (const i of cohort) {
      const alpha = s.field.params[i * 4];
      if (frame > 0) maximum = Math.max(maximum, Math.abs(alpha - previous[i]));
      previous[i] = alpha;
    }
  }
  assert.ok(maximum < 0.15, `largest alpha step was ${maximum}`);
});

test("hydrated reintegration settles an unfinished birth immediately", () => {
  const s = scene();
  s.spawn("root", null);
  s.spawn("child");
  s.step(0.4);
  s.send({ type: "agent.reintegrated", agentId: "child", hydrate: true });
  assert.deepEqual(s.substrate.snapshot(), { bodies: [{ agentId: "root", phase: "resident", resident: CAPACITY }], inFlight: 0, unowned: 0 });
});

test("hydrated action history accepts predecessors and matching decisions without regression", () => {
  const s = scene();
  s.spawn("root", null);
  for (const id of ["awaiting", "rejected", "completed"]) {
    s.send({ type: "action.proposed", actionId: id, agentId: "root", summary: id });
    s.send({ type: "authorization.requested", actionId: id });
    if (id !== "awaiting") s.send({ type: "authorization.resolved", actionId: id, decision: id === "rejected" ? "rejected" : "approved", authority: "policy" });
    if (id === "completed") {
      s.send({ type: "action.executing", actionId: id });
      s.send({ type: "action.completed", actionId: id });
    }
  }
  for (const id of ["awaiting", "rejected", "completed"]) {
    const before = { ...s.engine.model.actions[id] };
    s.send({ type: "action.proposed", actionId: id, agentId: "root", summary: id, hydrate: true });
    s.send({ type: "authorization.requested", actionId: id, hydrate: true });
    if (id !== "awaiting") s.send({ type: "authorization.resolved", actionId: id, decision: id === "rejected" ? "rejected" : "approved", authority: "policy", hydrate: true });
    if (id === "completed") {
      s.send({ type: "action.executing", actionId: id, hydrate: true });
      s.send({ type: "action.completed", actionId: id, hydrate: true });
    }
    assert.deepEqual(s.engine.model.actions[id], before);
  }
  const seq = s.engine.model.seq + 1;
  assert.equal(s.engine.ingest({ type: "authorization.resolved", actionId: "rejected", decision: "approved", authority: "policy", hydrate: true, seq }).accepted, false);
  assert.equal(s.engine.ingest({ type: "authorization.resolved", actionId: "rejected", decision: "rejected", authority: "someone else", hydrate: true, seq }).accepted, false);
  assert.equal(s.engine.ingest({ type: "action.failed", actionId: "completed", hydrate: true, seq }).accepted, false);
});
