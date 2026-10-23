import { test } from "node:test";
import assert from "node:assert/strict";
import { RaptorEngine } from "./engine.ts";
import type { RaptorEvent } from "./events.ts";
import { ParticleField } from "./particles.ts";
import { Substrate, packetCount } from "./substrate.ts";
import type { AnchorSet } from "./substrate.ts";

type Unsequenced = RaptorEvent extends infer E ? (E extends RaptorEvent ? Omit<E, "seq"> : never) : never;

const CAPACITY = 2400;
const ANCHORS: AnchorSet = {
  primary: { x: 120, y: 560, radius: 24 },
  agents: {
    a: { x: 120, y: 480, radius: 18 },
    b: { x: 120, y: 430, radius: 18 },
    c: { x: 120, y: 380, radius: 18 },
    "a.1": { x: 120, y: 330, radius: 18 },
  },
};

/** An engine feeding a substrate the way the renderer does: one sync per accepted event. */
function scene(options: { hydrateFrom?: Unsequenced[] } = {}) {
  const field = new ParticleField(CAPACITY);
  const substrate = new Substrate(field.lattice, CAPACITY);
  const engine = new RaptorEngine();
  let seq = 0;
  let wall = 0;
  const presence: string[][] = [];
  substrate.onPresence = (ids) => presence.push([...ids]);
  substrate.setAnchors(ANCHORS);
  const ingest = (event: Unsequenced) => engine.ingest({ ...event, seq: ++seq } as RaptorEvent);
  for (const event of options.hydrateFrom ?? []) ingest(event);
  engine.subscribe((model, record) => {
    if (record?.accepted) substrate.sync(model);
  });
  substrate.sync(engine.model);
  const send = (event: Unsequenced) => {
    const record = ingest(event);
    assert.ok(record.accepted, `${event.type} rejected: ${record.reason}`);
  };
  const step = (seconds: number, still = false) => {
    for (let t = 0; t < seconds; t += 1 / 60) {
      wall += 1 / 60;
      substrate.step(1 / 60, wall, still);
    }
  };
  const write = (still = false) => {
    substrate.step(0, wall, still);
    substrate.write(field, 800, 600, 4);
    return Float32Array.from(field.position);
  };
  return { field, substrate, engine, send, step, write, presence };
}

function assertConserved(substrate: Substrate) {
  const snap = substrate.snapshot();
  const resident = snap.bodies.reduce((sum, body) => sum + body.resident, 0);
  assert.equal(resident + snap.inFlight + snap.unowned, CAPACITY, "every particle is resident or in exactly one flight");
}

const spawn = (id: string, parentId = "root"): Unsequenced[] => [
  { type: "agent.spawned", agentId: id, parentId, label: id },
  { type: "agent.state", agentId: id, state: "running" },
];

test("the first agent owns every particle, and nothing is created or lost afterwards", () => {
  const { substrate, send, step } = scene();
  send({ type: "agent.spawned", agentId: "root", parentId: null, label: "Raptor" });
  assert.equal(substrate.snapshot().unowned, 0);
  for (const id of ["a", "b", "c"]) for (const event of spawn(id)) send(event);
  for (let k = 0; k < 40; k++) {
    step(0.1);
    assertConserved(substrate);
  }
  send({ type: "transfer", transferId: "p1", kind: "peer", fromAgentId: "a", toAgentId: "c", disposition: "delivered", bytes: 900 });
  send({ type: "transfer", transferId: "r1", kind: "result", fromAgentId: "b", toAgentId: "root", disposition: "delivered", bytes: 4000 });
  send({ type: "agent.state", agentId: "b", state: "completed" });
  send({ type: "agent.reintegrated", agentId: "b" });
  for (let k = 0; k < 60; k++) {
    step(0.1);
    assertConserved(substrate);
  }
});

test("a sub-agent is made of particles that left its parent, and they arrive as the same particles", () => {
  const { substrate, send, step } = scene();
  send({ type: "agent.spawned", agentId: "root", parentId: null, label: "Raptor" });
  const before = Int16Array.from(substrate.owner);
  for (const event of spawn("a")) send(event);
  const cohort: number[] = [];
  for (let i = 0; i < CAPACITY; i++) if (substrate.owner[i] !== before[i]) cohort.push(i);
  assert.ok(cohort.length >= 72, `a visible cohort leaves the parent (${cohort.length})`);
  assert.equal(new Set(cohort.map((i) => before[i])).size, 1, "the whole cohort came from the parent");
  assert.ok(cohort.every((i) => substrate.flightOf[i] >= 0), "the whole cohort is in the air, not teleported");
  step(4);
  const child = substrate.snapshot().bodies.find((body) => body.agentId === "a")!;
  assert.equal(child.resident, cohort.length, "the child holds exactly the particles that left");
  assert.ok(cohort.every((i) => substrate.flightOf[i] < 0 && substrate.owner[i] === substrate.owner[cohort[0]]));
});

test("a result carries a packet sized by its payload, then the finished agent returns the rest and its globe goes", () => {
  const { substrate, send, step, presence } = scene();
  send({ type: "agent.spawned", agentId: "root", parentId: null, label: "Raptor" });
  for (const event of spawn("a")) send(event);
  step(4);
  const held = substrate.snapshot().bodies.find((b) => b.agentId === "a")!.resident;
  send({ type: "transfer", transferId: "r1", kind: "result", fromAgentId: "a", toAgentId: "root", disposition: "delivered", bytes: 6000 });
  assert.equal(substrate.snapshot().inFlight, packetCount(6000));
  send({ type: "agent.state", agentId: "a", state: "completed" });
  send({ type: "agent.reintegrated", agentId: "a" });
  assert.equal(substrate.snapshot().inFlight, held, "the result and the rest of the agent are both on their way home");
  assert.ok(presence.at(-1)!.includes("a"), "the globe stays while its particles leave");
  step(5);
  const snap = substrate.snapshot();
  assert.deepEqual(snap.bodies.map((b) => b.agentId), ["root"]);
  assert.equal(snap.bodies[0].resident, CAPACITY);
  assert.deepEqual(presence.at(-1), ["root"]);
});

test("a nested agent returns to its parent, which then returns everything to the root", () => {
  const { substrate, send, step } = scene();
  send({ type: "agent.spawned", agentId: "root", parentId: null, label: "Raptor" });
  for (const event of spawn("a")) send(event);
  step(3);
  for (const event of spawn("a.1", "a")) send(event);
  step(3);
  send({ type: "agent.state", agentId: "a.1", state: "failed" });
  send({ type: "agent.reintegrated", agentId: "a.1" });
  step(0.5);
  send({ type: "agent.state", agentId: "a", state: "completed" });
  send({ type: "agent.reintegrated", agentId: "a" });
  step(8);
  const snap = substrate.snapshot();
  assert.deepEqual(snap.bodies.map((b) => b.agentId), ["root"]);
  assert.equal(snap.bodies[0].resident, CAPACITY);
});

test("joining a session already in progress draws its agents in place, with no flights", () => {
  const hydrateFrom: Unsequenced[] = [
    { type: "agent.spawned", agentId: "root", parentId: null, label: "Raptor" },
    ...spawn("a"),
    ...spawn("b"),
    { type: "transfer", transferId: "old", kind: "peer", fromAgentId: "a", toAgentId: "b", disposition: "delivered" },
  ];
  const { substrate } = scene({ hydrateFrom });
  const snap = substrate.snapshot();
  assert.equal(snap.inFlight, 0, "no old packet replays on reconnect");
  assert.deepEqual(snap.bodies.map((b) => b.agentId).sort(), ["a", "b", "root"]);
  assert.ok(snap.bodies.every((b) => b.resident > 0));
});

test("a replayed transfer is drawn once", () => {
  const { substrate, engine, send, step } = scene();
  send({ type: "agent.spawned", agentId: "root", parentId: null, label: "Raptor" });
  for (const event of spawn("a")) send(event);
  step(4);
  const transfer = { type: "transfer", transferId: "s1", kind: "steer", fromAgentId: "root", toAgentId: "a", disposition: "queued" } as const;
  send(transfer);
  const flying = substrate.snapshot().inFlight;
  assert.ok(flying > 0);
  assert.equal(engine.ingest({ ...transfer, seq: 1e9 }).accepted, false);
  assert.equal(substrate.snapshot().inFlight, flying);
});

test("an activity change morphs the same particles without a jump", () => {
  const { send, step, write } = scene();
  send({ type: "agent.spawned", agentId: "root", parentId: null, label: "Raptor" });
  send({ type: "agent.state", agentId: "root", state: "running" });
  step(1);
  let from = "listening";
  for (const to of ["searching", "solving", "composing", "shaping", "working", "listening"] as const) {
    step(2);
    const a = write();
    send({ type: "agent.activity", agentId: "root", activity: to });
    step(1 / 60);
    const b = write();
    let jump = 0;
    for (let k = 0; k < a.length; k++) jump = Math.max(jump, Math.abs(a[k] - b[k]));
    // 24 px radius in a 600 px tall stage of world height 4: one pixel is 0.0067 world units.
    assert.ok(jump < 0.02, `${from} → ${to} moved a particle ${jump.toFixed(4)} units in one frame`);
    from = to;
  }
});

test("reduced motion holds every particle still, and a transfer is a still route that lands", () => {
  const { substrate, send, step, write } = scene();
  send({ type: "agent.spawned", agentId: "root", parentId: null, label: "Raptor" });
  for (const event of spawn("a")) send(event);
  step(4);
  step(0.1, true);
  const a = write(true);
  step(0.5, true);
  const b = write(true);
  assert.deepEqual(a, b, "nothing moves between still frames");
  send({ type: "transfer", transferId: "r1", kind: "result", fromAgentId: "a", toAgentId: "root", disposition: "delivered" });
  assert.ok(substrate.snapshot().inFlight > 0, "the route is drawn");
  assert.notEqual(substrate.nextStillChange(), null);
  step(2, true);
  assert.equal(substrate.snapshot().inFlight, 0, "the route lands by itself");
});

test("a reset followed by a new root keeps the same particles in the same place", () => {
  const { substrate, send, step } = scene();
  send({ type: "agent.spawned", agentId: "root", parentId: null, label: "Raptor" });
  for (const event of spawn("a")) send(event);
  step(3);
  send({ type: "session.reset" });
  send({ type: "agent.spawned", agentId: "root-2", parentId: null, label: "Raptor" });
  step(5);
  const snap = substrate.snapshot();
  assert.deepEqual(snap.bodies.map((b) => b.agentId), ["root-2"]);
  assert.equal(snap.bodies[0].resident, CAPACITY);
});
