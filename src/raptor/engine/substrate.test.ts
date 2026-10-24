import "./activity-continuity.test.ts";
import "./substrate-lifecycle.test.ts";
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
  let wall = 0;
  const substrate = new Substrate(field.lattice, CAPACITY, () => wall);
  const engine = new RaptorEngine();
  let seq = 0;
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
      substrate.step(still ? 0 : 1 / 60, still);
    }
  };
  const idle = (seconds: number) => {
    wall += seconds;
  };
  const write = (still = false) => {
    substrate.step(0, still);
    substrate.write(field, 800, 600, 4);
    return Float32Array.from(field.position);
  };
  return { field, substrate, engine, send, step, write, presence, idle };
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
  const { substrate, send, step, write, idle } = scene();
  send({ type: "agent.spawned", agentId: "root", parentId: null, label: "Raptor" });
  for (const event of spawn("a")) send(event);
  step(4);
  step(0.1, true);
  const a = write(true);
  step(0.5, true);
  const b = write(true);
  assert.deepEqual(a, b, "nothing moves between still frames");
  // A still frame can be long ago; the route still shows for its full hold from the moment it was sent.
  idle(30);
  send({ type: "transfer", transferId: "r1", kind: "result", fromAgentId: "a", toAgentId: "root", disposition: "delivered" });
  step(0.5, true);
  assert.ok(substrate.snapshot().inFlight > 0, "the route is drawn");
  assert.notEqual(substrate.nextStillChange(), null);
  step(2, true);
  assert.equal(substrate.snapshot().inFlight, 0, "the route lands by itself");
});

test("a reset followed by a new root conserves the particle population", () => {
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


test("row residents follow layout on the next frame and clipped rows disappear without a trail", () => {
  const s = scene();
  s.send({ type: "agent.spawned", agentId: "root", parentId: null, label: "raptor" });
  for (const event of spawn("a")) s.send(event);
  s.step(4);
  const before = s.write();
  const child = s.substrate.owner.findIndex(slot => slot === 1);
  const root = s.substrate.owner.findIndex(slot => slot === 0);
  assert.ok(child >= 0 && root >= 0);
  s.substrate.setAnchors({
    primary: { x: 300, y: 300, radius: 90 },
    agents: { a: { x: 160, y: 280, radius: 18 } },
  });
  const moved = s.write();
  assert.ok(Math.abs(moved[child * 3] - before[child * 3] - 40 * 4 / 600) < 1e-6, "row x follows immediately");
  assert.ok(Math.abs(moved[child * 3 + 1] - before[child * 3 + 1] - 200 * 4 / 600) < 1e-6, "row y follows immediately");
  assert.equal(moved[root * 3], before[root * 3], "the root keeps its docking spring");
  assert.equal(moved[root * 3 + 1], before[root * 3 + 1]);
  s.substrate.setAnchors({ primary: ANCHORS.primary, agents: { a: null } });
  s.write();
  assert.ok(s.field.params.some((alpha, i) => i % 4 === 0 && alpha > 0), "the root remains visible");
  for (let i = 0; i < CAPACITY; i++) {
    if (s.substrate.owner[i] === 1 && s.substrate.flightOf[i] < 0) assert.equal(s.field.params[i * 4], 0, "hidden row residents never fade over the composer");
  }
  s.substrate.setAnchors(ANCHORS);
  const returned = s.write();
  assert.equal(returned[child * 3], before[child * 3], "scrolling back restores the row immediately");
  assert.equal(returned[child * 3 + 1], before[child * 3 + 1]);
  s.send({ type: "transfer", transferId: "steer-visible", kind: "steer", fromAgentId: "root", toAgentId: "a", disposition: "delivered" });
  assert.ok(s.substrate.snapshot().inFlight > 0, "layout following preserves particle flights");
});

test("returning rows follow their clipped slots and departures clip until they leave the row", () => {
  const s = scene();
  s.send({ type: "agent.spawned", agentId: "root", parentId: null, label: "raptor" });
  for (const event of spawn("a")) s.send(event);
  s.step(4);
  const clip = { left: 20, top: 120, right: 360, bottom: 510 };
  s.substrate.setAnchors({ primary: ANCHORS.primary, agents: { a: { x: 120, y: 130, radius: 18, clip } } });
  const before = s.write();
  let residents = 0;
  for (let i = 0; i < CAPACITY; i++) {
    if (s.substrate.owner[i] !== 1 || s.field.params[i * 4] <= 0) continue;
    residents++;
    assert.deepEqual([...s.field.clip.subarray(i * 4, i * 4 + 4)], [20, 90, 360, 480], "the renderer receives the viewport in bottom-origin pixels");
  }
  assert.ok(residents > 0, "the visible part of a top row keeps its particles");
  s.send({ type: "agent.reintegrated", agentId: "a" });
  s.substrate.setAnchors({ primary: ANCHORS.primary, agents: { a: { x: 160, y: 200, radius: 18, clip } } });
  s.write();
  let flights = 0;
  for (let i = 0; i < CAPACITY; i++) {
    if (s.substrate.flightOf[i] < 0) continue;
    flights++;
    assert.deepEqual([...s.field.clip.subarray(i * 4, i * 4 + 4)], [20, 90, 360, 480], "departures still resting at the source retain its clip");
    assert.ok(Math.abs(s.field.position[i * 3] - before[i * 3] - 40 * 4 / 600) < 1e-6, "a returning row follows horizontal layout before departure");
    assert.ok(Math.abs(s.field.position[i * 3 + 1] - before[i * 3 + 1] + 70 * 4 / 600) < 1e-6, "a returning row follows vertical layout before departure");
  }
  assert.ok(flights > 0);
  s.step(0.15);
  s.write();
  let moving = 0;
  for (let i = 0; i < CAPACITY; i++) {
    if (s.substrate.flightOf[i] >= 0 && s.field.clip[i * 4 + 2] === 0) moving++;
  }
  assert.ok(moving > 0, "moving return particles cross the viewport freely");
});

test("the root reports where it is when its place changes and when it settles there, not every frame", () => {
  const { substrate, send, step } = scene();
  const reports: { x: number; settled: boolean }[] = [];
  substrate.onPrimary = (frame, settled) => reports.push({ x: Math.round(frame.x), settled });
  send({ type: "agent.spawned", agentId: "root", parentId: null, label: "raptor" });
  step(0.5);
  assert.deepEqual(reports, [{ x: 120, settled: true }]);

  // The empty chat's hero gives way to the composer's dock: one report as the move starts, one on arrival.
  substrate.setAnchors({ ...ANCHORS, primary: { x: 40, y: 580, radius: 22 } });
  step(1 / 60);
  assert.equal(reports.length, 2);
  assert.equal(reports[1]!.settled, false);
  assert.ok(reports[1]!.x > 40, "the move starts from where the root was drawn");
  step(4);
  assert.deepEqual(reports.at(-1), { x: 40, settled: true });
  assert.equal(reports.length, 3);
});

test("the root reports arriving only once it has stopped, not while it passes through its place", () => {
  const { substrate, send, step } = scene();
  const reports: { x: number; settled: boolean }[] = [];
  substrate.onPrimary = (frame, settled) => reports.push({ x: frame.x, settled });
  send({ type: "agent.spawned", agentId: "root", parentId: null, label: "raptor" });
  step(0.5);
  substrate.setAnchors({ ...ANCHORS, primary: { x: 40, y: 560, radius: 24 } });
  for (let frame = 0; frame < 12; frame++) step(1 / 60);

  // The layout moves the dock onto the globe's path while it is still flying there with momentum.
  substrate.setAnchors({ ...ANCHORS, primary: { x: 96, y: 560, radius: 24 } });
  for (let frame = 0; frame < 240; frame++) step(1 / 60);
  const arrival = reports.findIndex((report, i) => i > 1 && report.settled);
  assert.ok(arrival > 1, "the root arrives at its new place");
  assert.ok(Math.abs(reports[arrival]!.x - 96) < 0.5);
  assert.deepEqual(reports.slice(arrival + 1), [], "no report follows the arrival without another move");
});

test("a particle in flight eases into its destination's depth instead of snapping to it on landing", () => {
  const { field, substrate, send, step } = scene();
  const frame = () => {
    step(1 / 60);
    substrate.write(field, 800, 600, 4);
  };
  send({ type: "agent.spawned", agentId: "root", parentId: null, label: "raptor" });
  send({ type: "agent.spawned", agentId: "a", parentId: "root", label: "a" });
  send({ type: "agent.state", agentId: "a", state: "running" });
  for (let k = 0; k < 240; k++) frame();
  send({ type: "transfer", transferId: "r", kind: "result", fromAgentId: "a", toAgentId: "root", disposition: "delivered", bytes: 4000 });
  frame();
  const depth = (i: number) => field.params[i * 4 + 2]!;
  const before = Array.from({ length: CAPACITY }, (_, i) => ({ depth: depth(i), flying: substrate.flightOf[i]! >= 0 }));
  let flown = 0;
  let worst = 0;
  for (let k = 0; k < 300; k++) {
    frame();
    for (let i = 0; i < CAPACITY; i++) {
      if (before[i]!.flying && field.params[i * 4]! > 0.02) {
        flown++;
        worst = Math.max(worst, Math.abs(depth(i) - before[i]!.depth));
      }
      before[i] = { depth: depth(i), flying: substrate.flightOf[i]! >= 0 };
    }
  }
  assert.ok(flown > 0, "the result flew");
  assert.ok(worst < 0.1, `a visible particle's depth jumped by ${worst.toFixed(3)} in one frame`);
});

test("a row with no place on screen sends and receives from where its parent is now", () => {
  for (const shownFirst of [false, true]) {
    const { field, substrate, send, step } = scene();
    const unit = 4 / 600;
    const frame = () => {
      step(1 / 60);
      substrate.write(field, 800, 600, 4);
    };
    const row = { x: 120, y: 480, radius: 18 };
    substrate.setAnchors({ primary: { x: 120, y: 560, radius: 24 }, agents: { a: shownFirst ? row : null } });
    send({ type: "agent.spawned", agentId: "root", parentId: null, label: "raptor" });
    send({ type: "agent.spawned", agentId: "a", parentId: "root", label: "a" });
    send({ type: "agent.state", agentId: "a", state: "running" });
    for (let k = 0; k < 240; k++) frame();

    // The row scrolls out of the list (or never had room), then the window widens and the dock moves right.
    substrate.setAnchors({ primary: { x: 400, y: 560, radius: 24 }, agents: { a: null } });
    for (let k = 0; k < 240; k++) frame();
    send({ type: "transfer", transferId: `r${shownFirst}`, kind: "result", fromAgentId: "a", toAgentId: "root", disposition: "delivered", bytes: 4000 });
    let leftmost = Infinity;
    for (let k = 0; k < 30; k++) {
      frame();
      for (let i = 0; i < CAPACITY; i++) {
        if (substrate.flightOf[i]! >= 0 && field.params[i * 4]! >= 0.05) leftmost = Math.min(leftmost, field.position[i * 3]! / unit + 400);
      }
    }
    assert.ok(leftmost < Infinity, "the result flew");
    assert.ok(leftmost > 300, `${shownFirst ? "a scrolled-out" : "a never-shown"} row's result appears at x=${leftmost.toFixed(1)}, far from the dock at x=400`);
  }
});

test("a returning row that was never drawn sends its particles home from where its parent is now", () => {
  const { field, substrate, send, step } = scene();
  const unit = 4 / 600;
  const frame = () => {
    step(1 / 60);
    substrate.write(field, 800, 600, 4);
  };
  substrate.setAnchors({ primary: { x: 120, y: 560, radius: 24 }, agents: { a: null } });
  send({ type: "agent.spawned", agentId: "root", parentId: null, label: "raptor" });
  send({ type: "agent.spawned", agentId: "a", parentId: "root", label: "a" });
  send({ type: "agent.state", agentId: "a", state: "running" });
  for (let k = 0; k < 240; k++) frame();

  // The child rejoins, then the window widens and the dock moves right while its particles fly home.
  send({ type: "agent.reintegrated", agentId: "a" });
  substrate.setAnchors({ primary: { x: 400, y: 560, radius: 24 }, agents: { a: null } });
  let leftmost = Infinity;
  for (let k = 0; k < 70; k++) {
    frame();
    // By three quarters of a second the root's docking spring has carried it past x=350.
    if (k < 45) continue;
    for (let i = 0; i < CAPACITY; i++) {
      if (substrate.flightOf[i]! >= 0 && field.params[i * 4]! > 0.05) leftmost = Math.min(leftmost, field.position[i * 3]! / unit + 400);
    }
  }
  assert.ok(leftmost < Infinity, "its particles flew home");
  assert.ok(leftmost > 250, `return particles start at x=${leftmost.toFixed(1)}, where the dock used to be`);
});

test("a row that rejoins before it is ever drawn sends its particles home from where its parent is now", () => {
  const { field, substrate, send, step } = scene();
  const unit = 4 / 600;
  const frame = () => {
    step(1 / 60);
    substrate.write(field, 800, 600, 4);
  };
  substrate.setAnchors({ primary: { x: 120, y: 560, radius: 24 }, agents: { a: null } });
  send({ type: "agent.spawned", agentId: "root", parentId: null, label: "raptor" });
  for (let k = 0; k < 240; k++) frame();

  // A short-lived child starts and rejoins between two animation frames, then the dock moves right.
  send({ type: "agent.spawned", agentId: "a", parentId: "root", label: "a" });
  send({ type: "agent.state", agentId: "a", state: "running" });
  send({ type: "agent.reintegrated", agentId: "a" });
  substrate.setAnchors({ primary: { x: 400, y: 560, radius: 24 }, agents: { a: null } });
  let leftmost = Infinity;
  for (let k = 0; k < 180; k++) {
    frame();
    // By three quarters of a second the root's docking spring has carried it past x=350.
    if (k < 45) continue;
    for (let i = 0; i < CAPACITY; i++) {
      if (substrate.flightOf[i]! >= 0 && field.params[i * 4]! > 0.05) leftmost = Math.min(leftmost, field.position[i * 3]! / unit + 400);
    }
  }
  assert.ok(leftmost < Infinity, "its particles flew");
  assert.ok(leftmost > 250, `its particles fly at x=${leftmost.toFixed(1)}, where the dock used to be`);
});
