import { test } from "node:test";
import assert from "node:assert/strict";
import { RaptorEngine } from "./engine.ts";
import type { UnsequencedEvent } from "./events.ts";
import { ParticleField } from "./particles.ts";
import { Substrate } from "./substrate.ts";

const CAPACITY = 2400;
function scene(attached = true, capacity = CAPACITY) {
  const engine = new RaptorEngine();
  const field = new ParticleField(capacity);
  const substrate = new Substrate(field.lattice, capacity);
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
    assert.equal(snap.inFlight + snap.unowned + snap.bodies.reduce((n, b) => n + b.resident, 0), capacity);
  };
  /** Every particle owned, every live agent drawn with particles, and no globe for an agent the model no longer has. */
  const drawn = () => {
    const snap = substrate.snapshot();
    const live = new Set(Object.values(engine.model.agents).filter(a => !a.retired).map(a => a.id));
    const problems: string[] = [];
    if (snap.inFlight + snap.unowned + snap.bodies.reduce((n, b) => n + b.resident, 0) !== capacity) problems.push("not conserved");
    if (snap.unowned) problems.push(`${snap.unowned} unowned`);
    for (const b of snap.bodies) {
      if (live.has(b.agentId) && b.phase === "resident" && b.resident === 0) problems.push(`${b.agentId} live and empty`);
      if (!live.has(b.agentId) && b.phase === "resident") problems.push(`${b.agentId} drawn but gone from the model`);
    }
    for (const id of live) if (!snap.bodies.some(b => b.agentId === id && b.phase === "resident")) problems.push(`${id} has no globe`);
    return problems;
  };
  const offer = (event: UnsequencedEvent) => engine.ingest({ ...event, seq: ++seq }).accepted;
  return { engine, field, substrate, attach, send, spawn, step, conserved, drawn, offer };
}

test("a real reset clears every old body and flight before a new session is populated", () => {
  const s = scene();
  s.spawn("root", null);
  s.spawn("child");
  assert.ok(s.substrate.snapshot().inFlight > 0);
  s.send({ type: "session.reset" });
  assert.deepEqual(s.substrate.snapshot(), { bodies: [], inFlight: 0, unowned: CAPACITY, pending: 0, resolved: 0 });
  s.spawn("next", null);
  assert.deepEqual(s.substrate.snapshot(), { bodies: [{ agentId: "next", phase: "resident", resident: CAPACITY }], inFlight: 0, unowned: 0, pending: 0, resolved: 0 });
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
  assert.deepEqual(s.substrate.snapshot(), { bodies: [{ agentId: "root", phase: "resident", resident: CAPACITY }], inFlight: 0, unowned: 0, pending: 0, resolved: 0 });
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

for (const [capacity, children] of [[2400, 16], [2400, 24], [13000, 24]]) test(`root briefs and steers reach ${children} settled children at capacity ${capacity}`, () => {
  const s = scene(true, capacity);
  s.spawn("root", null);
  for (let i = 0; i < children; i++) {
    s.spawn(`c${i}`);
    s.step(0.3);
  }
  s.step(20);
  for (let i = 0; i < 8; i++) {
    s.send({ type: "transfer", transferId: `brief-${i}`, kind: "brief", fromAgentId: "root", toAgentId: `c${i}`, disposition: "delivered" });
    s.send({ type: "transfer", transferId: `steer-${i}`, kind: "steer", fromAgentId: "root", toAgentId: `c${i}`, disposition: "queued", bytes: 400 });
  }
  for (let frame = 0; frame < 60 * 30; frame++) {
    s.step(1 / 60);
    if (frame % 30 === 0) s.conserved();
  }
  const snap = s.substrate.snapshot();
  assert.equal(snap.pending, 0, "every accepted root transfer left the queue");
  assert.equal(snap.resolved, 0, "and each one left as a flight");
  assert.equal(snap.inFlight, 0);
  assert.ok(snap.bodies.every(b => b.resident > 0));
  s.conserved();
});

test("a request waiting for particles holds back only later requests on its own route", () => {
  const s = scene();
  s.spawn("root", null);
  for (let i = 0; i < 14; i++) s.spawn(`c${i}`);
  s.step(20);
  // Children that formed early hold more than the final cohort; one brief rebalances them, the next spends root slack.
  for (let i = 0; i < 2; i++) {
    s.send({ type: "transfer", transferId: `warm-${i}`, kind: "brief", fromAgentId: "root", toAgentId: "c13", disposition: "delivered" });
    s.step(5);
  }
  assert.equal(s.substrate.snapshot().pending, 0);
  s.send({ type: "transfer", transferId: "big", kind: "brief", fromAgentId: "root", toAgentId: "c0", disposition: "delivered", bytes: 1e6 });
  assert.equal(s.substrate.snapshot().pending, 1, "the full packet waits for particles");
  s.send({ type: "transfer", transferId: "later", kind: "brief", fromAgentId: "root", toAgentId: "c0", disposition: "delivered" });
  assert.equal(s.substrate.snapshot().pending, 2, "a later brief to the same child keeps its place behind it");
  const flying = s.substrate.snapshot().inFlight;
  s.send({ type: "transfer", transferId: "steer", kind: "steer", fromAgentId: "root", toAgentId: "c1", disposition: "queued" });
  assert.equal(s.substrate.snapshot().inFlight, flying + 48, "a steer to another child leaves at once");
  s.step(20);
  assert.equal(s.substrate.snapshot().pending, 0);
  s.conserved();
});

test("an accepted transfer whose destination finishes before it can fly is resolved, not dropped", () => {
  const s = scene();
  s.spawn("root", null);
  for (let i = 0; i < 14; i++) s.spawn(`c${i}`);
  s.step(20);
  for (let i = 0; i < 2; i++) {
    s.send({ type: "transfer", transferId: `warm-${i}`, kind: "brief", fromAgentId: "root", toAgentId: "c13", disposition: "delivered" });
    s.step(5);
  }
  s.send({ type: "transfer", transferId: "late", kind: "brief", fromAgentId: "root", toAgentId: "c0", disposition: "delivered", bytes: 1e6 });
  assert.equal(s.substrate.snapshot().pending, 1, "the full packet waits for particles");
  s.send({ type: "agent.reintegrated", agentId: "c0" });
  for (let frame = 0; frame < 60 * 10; frame++) {
    s.step(1 / 60);
    s.conserved();
  }
  const snap = s.substrate.snapshot();
  assert.equal(snap.resolved, 1, "the transfer is accounted for without a flight");
  assert.equal(snap.pending, 0);
  assert.ok(!snap.bodies.some(b => b.agentId === "c0"), "the finished child's globe is not held open for it");
});

test("a child that comes back while a flight still leaves its old globe forms a cohort again", () => {
  const s = scene();
  s.spawn("root", null);
  s.spawn("a");
  s.spawn("b");
  // b is far away, so a's message to it is still in the air after a's return has landed.
  s.substrate.setAnchors({ primary: { x: 400, y: 500, radius: 42 }, overflow: { x: 400, y: 200, radius: 18 }, agents: { b: { x: 3000, y: 200, radius: 18 } } });
  s.step(5);
  s.send({ type: "transfer", transferId: "t1", kind: "peer", fromAgentId: "a", toAgentId: "b", disposition: "delivered" });
  s.send({ type: "agent.reintegrated", agentId: "a" });
  s.step(2.1);
  assert.equal(s.substrate.snapshot().bodies.find(b => b.agentId === "a")?.resident, 0, "only the outbound message keeps a's globe");
  s.spawn("a");
  s.step(10);
  assert.deepEqual(s.drawn(), []);
  assert.equal(s.substrate.snapshot().pending, 0);
});

test("a child that comes back before its first cohort was assigned still forms", () => {
  const s = scene();
  s.spawn("root", null);
  s.spawn("a");
  s.spawn("b", "a");
  s.send({ type: "agent.reintegrated", agentId: "b" });
  s.spawn("b", "a");
  s.step(10);
  assert.deepEqual(s.drawn(), []);
});

test("a view attached after a root handoff draws the successor root and the child it inherited", () => {
  const s = scene(false);
  s.spawn("R", null);
  s.spawn("c", "R");
  s.send({ type: "agent.handoff", fromAgentId: "R", toAgentId: "H", label: "H" });
  s.attach();
  assert.equal(s.substrate.snapshot().inFlight, 0, "a late view draws history in place");
  assert.deepEqual(s.drawn(), []);
  const resident = Object.fromEntries(s.substrate.snapshot().bodies.map(b => [b.agentId, b.resident]));
  assert.ok(resident.H > resident.c, "the root keeps the larger share");
});

test("a view attached after a child handoff draws the successor and the grandchild it inherited", () => {
  const s = scene(false);
  s.spawn("root", null);
  s.spawn("P");
  s.spawn("c", "P");
  s.send({ type: "agent.handoff", fromAgentId: "P", toAgentId: "P2", label: "P2" });
  s.attach();
  s.step(5);
  assert.deepEqual(s.drawn(), []);
  assert.deepEqual(s.substrate.snapshot().bodies.map(b => b.agentId), ["root", "P2", "c"]);
});

test("a child handoff moves the predecessor's particles to its successor and nothing more", () => {
  const s = scene();
  s.spawn("root", null);
  s.spawn("a");
  s.spawn("b");
  s.step(6);
  const before = Object.fromEntries(s.substrate.snapshot().bodies.map(b => [b.agentId, b.resident]));
  s.send({ type: "agent.handoff", fromAgentId: "a", toAgentId: "a2", label: "a2" });
  for (let frame = 0; frame < 600; frame++) {
    s.step(1 / 60);
    s.conserved();
  }
  const after = Object.fromEntries(s.substrate.snapshot().bodies.map(b => [b.agentId, b.resident]));
  assert.deepEqual(after, { root: before.root, b: before.b, a2: before.a });
});

test("rolling back across a root handoff returns the children it re-parented to the restored root", () => {
  const s = scene();
  s.spawn("R", null);
  s.send({ type: "checkpoint.created", checkpointId: "cp" });
  s.spawn("c", "R");
  s.step(5);
  s.send({ type: "agent.handoff", fromAgentId: "R", toAgentId: "H", label: "H" });
  s.step(5);
  s.send({ type: "rollback.started", checkpointId: "cp" });
  s.send({ type: "rollback.completed", checkpointId: "cp" });
  for (let frame = 0; frame < 60 * 10; frame++) {
    s.step(1 / 60);
    s.conserved();
  }
  assert.deepEqual(s.substrate.snapshot().bodies, [{ agentId: "R", phase: "resident", resident: CAPACITY }]);
});

/** Small deterministic generator, so a failing trial names a seed that replays exactly. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("random lifecycles with revival, handoff and rollback settle with every live agent drawn", () => {
  const kinds = ["brief", "result", "steer", "peer"] as const;
  for (let seed = 1; seed <= 24; seed++) {
    const r = random(seed);
    const s = scene();
    const pick = <T>(items: readonly T[]) => items[Math.floor(r() * items.length)];
    const place = () => ({ x: 200 + r() * 2800, y: 100 + r() * 600, radius: 14 + r() * 30 });
    const agents: Record<string, ReturnType<typeof place> | undefined> = {};
    s.substrate.setAnchors({ primary: place(), overflow: place(), agents });
    s.spawn("root", null);
    const live = () => Object.values(s.engine.model.agents).filter(a => !a.retired);
    let next = 0;
    for (let k = 0; k < 40 + Math.floor(r() * 60); k++) {
      const ids = live().map(a => a.id);
      const children = live().filter(a => a.parentId !== null).map(a => a.id);
      const x = r();
      if (x < 0.22) {
        const id = r() < 0.3 && children.length ? `re${pick(children)}` : `a${next++}`;
        agents[id] = r() < 0.8 ? place() : undefined;
        s.offer({ type: "agent.spawned", agentId: id, parentId: pick(ids), label: id, hydrate: r() < 0.15 });
      } else if (x < 0.48 && ids.length > 1) {
        s.offer({ type: "transfer", transferId: `t${k}`, kind: pick(kinds), fromAgentId: pick(ids), toAgentId: pick(ids), disposition: "delivered", bytes: r() < 0.5 ? r() * 20000 : undefined, hydrate: r() < 0.1 });
      } else if (x < 0.62 && children.length) {
        const id = pick(children);
        if (s.offer({ type: "agent.reintegrated", agentId: id, hydrate: r() < 0.1 }) && r() < 0.5) {
          s.step(r() < 0.5 ? 0 : r() * 3);
          s.offer({ type: "agent.spawned", agentId: id, parentId: live().find(a => a.parentId === null)!.id, label: id });
        }
      } else if (x < 0.7 && children.length) {
        const id = pick(children);
        s.offer({ type: "agent.handoff", fromAgentId: id, toAgentId: `${id}'`, label: id });
      } else if (x < 0.72) {
        const head = live().find(a => a.parentId === null)!;
        s.offer({ type: "agent.handoff", fromAgentId: head.id, toAgentId: `${head.id}'`, label: head.id });
      } else if (x < 0.78) {
        const id = pick(ids);
        s.offer({ type: "agent.spawned", agentId: id, parentId: s.engine.model.agents[id].parentId, label: id, hydrate: true });
      } else if (x < 0.8) {
        for (const id of Object.keys(agents)) if (r() < 0.3) agents[id] = r() < 0.7 ? place() : undefined;
      } else if (x < 0.88) {
        const checkpoint = s.engine.model.checkpoint;
        if (!checkpoint || r() < 0.5) s.offer({ type: "checkpoint.created", checkpointId: `cp${k}` });
        else {
          s.offer({ type: "rollback.started", checkpointId: checkpoint.id });
          if (r() < 0.3) s.step(r() * 2);
          s.offer({ type: "rollback.completed", checkpointId: checkpoint.id });
        }
      } else s.step(r() * 4);
    }
    s.step(30);
    const snap = s.substrate.snapshot();
    assert.deepEqual(s.drawn(), [], `seed ${seed}`);
    assert.equal(snap.pending, 0, `seed ${seed}: queued requests drain`);
    assert.equal(snap.inFlight, 0, `seed ${seed}: every flight lands`);
    assert.ok(snap.bodies.every(b => b.phase === "resident"), `seed ${seed}: finished globes are released`);
  }
});
