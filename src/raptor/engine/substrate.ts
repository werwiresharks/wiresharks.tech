import { MORPH_SECONDS, POSE_COUNT, POSE_OF, POSE_SPIN, POSE_WANDER, STILL_TIME, WAITING, ease, writePose } from "./activity.ts";
import type { AgentState, TransferKind } from "./events.ts";
import type { Tone } from "./layout.ts";
import { rootAgent } from "./model.ts";
import type { RaptorModel } from "./model.ts";
import { COLORS, SURFACES } from "./palette.ts";
import type { Surface, ToneStyle } from "./palette.ts";

/**
 * One continuous particle population shared by every agent in a session.
 *
 * Each agent is a body: a globe at a measured anchor (CSS pixels in the stage)
 * whose particles blend between activity poses. Every particle is owned by
 * exactly one body or travels in exactly one flight, so a spawned sub-agent is
 * made of its parent's particles, a brief or a result is a train of particles
 * that leaves one globe and joins another, and a finished agent returns what
 * it holds. Nothing is created or destroyed after construction.
 *
 * Pure apart from the typed arrays it writes; the renderer owns WebGL.
 */

/** A globe's place in the stage, in CSS pixels. */
export type Frame = { x: number; y: number; radius: number };

export type AnchorSet = {
  /** The root agent: the hero when the conversation is empty, the composer dock after. */
  primary?: Frame | null;
  /** Each sub-agent's globe, e.g. the leading slot of its row, keyed by agent id. */
  agents?: Readonly<Record<string, Frame | null | undefined>>;
  /** Where agents without a visible row gather, e.g. a collapsed summary. */
  overflow?: Frame | null;
};

/** What the substrate reads from a particle field: stable identity per particle. */
export type Lattice = {
  readonly dir: Float32Array;
  readonly radial: Float32Array;
  readonly shell: Uint8Array;
  readonly seed: Float32Array;
  readonly accentMask: Uint8Array;
};

/** Typed arrays the renderer uploads: xyz, rgb and (alpha, size, local depth, seed). */
export type ParticleBuffers = {
  readonly position: Float32Array;
  readonly color: Float32Array;
  readonly params: Float32Array;
};

export type BodyPhase = "resident" | "returning";

export type SubstrateSnapshot = {
  bodies: { agentId: string; phase: BodyPhase; resident: number }[];
  inFlight: number;
  unowned: number;
};

type FlightKind = TransferKind | "spawn" | "return" | "handoff";

type Body = {
  id: string;
  parentId: string | null;
  root: boolean;
  frame: Frame;
  velocity: Frame;
  placed: boolean;
  /** 0–1: drawn only while it has somewhere to be drawn. */
  presence: number;
  weights: Float64Array;
  from: Float64Array;
  pose: number;
  morphAt: number;
  angles: Float64Array;
  tone: Tone;
  base: [number, number, number];
  accent: [number, number, number];
  alpha: number;
  phase: BodyPhase;
  /** Where a returning body sends what it holds, including late arrivals. */
  returnTo: string | null;
  /** Earliest time a return may leave, so a result goes first. */
  holdUntil: number;
  offset: number;
  // Per-frame scratch
  cos: Float64Array;
  sin: Float64Array;
  tilt: Float64Array;
  active: number[];
  spin: number;
  wander: number;
  density: number;
  resident: number;
};

type Flight = {
  kind: FlightKind;
  from: number;
  to: number;
  start: number;
  duration: number;
  spread: number;
  members: Int32Array;
  bend: number;
  /** Reduced motion: wall-clock second at which the still route marker lands. */
  landAt: number;
};

const SHELL_SPEED = [0.11, -0.08, 0.15];
const ROOT_SPRING = 4.6;
const SPRING = 9;
/** Visible particles per square pixel of radius: a globe's density, as on the site. */
const DENSITY = 0.9;
const STILL_HOLD = 1.6;
const PACKET = 48;

const clamp = (n: number, lo: number, hi: number) => (n < lo ? lo : n > hi ? hi : n);
const fract = (n: number) => n - Math.floor(n);
const smoothstep = (n: number) => {
  const t = clamp(n, 0, 1);
  return t * t * (3 - 2 * t);
};
/** Small globes (the dock, rows) get visible life, as on the site. */
const smallness = (radius: number) => clamp((70 - radius) / 40, 0, 1);

const TONE_OF: Record<AgentState, Tone> = {
  idle: "idle",
  proposing: "running",
  running: "running",
  awaiting: "awaiting",
  completed: "completed",
  failed: "failed",
};

/** Particles a packet carries: denser for larger payloads, never a throughput meter. */
export function packetCount(bytes: number | null) {
  if (bytes === null) return PACKET;
  return clamp(Math.round(24 + 14 * Math.log2(1 + bytes / 512)), 24, 160);
}

export class Substrate {
  private readonly lattice: Lattice;
  private readonly capacity: number;
  private active: number;
  /** Body slot that owns each particle (its destination while in flight), or -1. */
  readonly owner: Int16Array;
  /** Flight slot carrying each particle, or -1. */
  readonly flightOf: Int16Array;
  private depart: Float64Array;
  private bodies: (Body | null)[] = [];
  private slots = new Map<string, number>();
  private flights: (Flight | null)[] = [];
  private time = 0;
  /** Real seconds, for still (reduced-motion) route markers that land on their own. */
  private readonly clock: () => number;
  private still = false;
  private synced = false;
  private lastTransferSeq = 0;
  private tones: Record<Tone, ToneStyle> = SURFACES.light.tones;
  private glow: [number, number, number] = COLORS.red;
  private ink: [number, number, number] = COLORS.graphite;
  /** Light dots on a dark ground read thinner, so small globes there get a little more alpha and size. */
  private darkLift = 0;
  private anchors: AnchorSet = {};
  private presenceKey = "";
  private scratch = new Float32Array(5);
  private sample = new Float64Array(18);
  onPresence: ((ids: readonly string[]) => void) | null = null;

  constructor(lattice: Lattice, capacity: number, clock: () => number = () => performance.now() / 1000) {
    this.lattice = lattice;
    this.clock = clock;
    this.capacity = capacity;
    this.active = capacity;
    this.owner = new Int16Array(capacity).fill(-1);
    this.flightOf = new Int16Array(capacity).fill(-1);
    this.depart = new Float64Array(capacity);
  }

  setSurface(surface: Surface) {
    this.tones = SURFACES[surface].tones;
    this.glow = surface === "dark" ? [1, 0.36, 0.3] : COLORS.red;
    this.ink = this.tones.idle.base;
    this.darkLift = surface === "dark" ? 1 : 0;
  }

  /** Particles beyond `count` are hidden (load shedding); ownership is kept for when they return. */
  setActive(count: number) {
    this.active = clamp(Math.round(count), 0, this.capacity);
  }

  setAnchors(anchors: AnchorSet) {
    this.anchors = anchors;
  }

  // ---------------------------------------------------------------------------
  // Semantic sync: bodies follow the model's agents; new transfers start flights.

  sync(model: RaptorModel) {
    const hydrating = !this.synced;
    this.synced = true;
    const root = rootAgent(model);
    const seen = new Set<string>();
    for (const id of model.order) {
      const agent = model.agents[id];
      if (agent.retired) continue;
      seen.add(id);
      let slot = this.slots.get(id);
      if (slot === undefined) slot = this.createBody(id, agent.parentId, agent.id === root?.id, hydrating);
      const body = this.bodies[slot]!;
      body.parentId = agent.parentId;
      body.root = agent.id === root?.id;
      body.tone = TONE_OF[agent.state];
      const pose = agent.state === "awaiting" ? WAITING : POSE_OF[agent.activity];
      if (pose !== body.pose) this.morph(body, pose, hydrating);
    }
    for (const [id, slot] of this.slots) {
      const body = this.bodies[slot]!;
      if (seen.has(id) || body.phase === "returning") continue;
      const agent = model.agents[id];
      const to = (agent?.successorId ?? body.parentId ?? root?.id) || null;
      const destination = to !== null ? this.slots.get(to) : undefined;
      // A root with nowhere to go (reset) stays, to be adopted by the next root.
      if (destination === undefined) continue;
      body.phase = "returning";
      body.returnTo = to;
      this.send(slot, destination, agent?.successorId ? "handoff" : "return", Infinity, hydrating);
    }
    for (const transfer of model.transfers) {
      if (transfer.seq <= this.lastTransferSeq) continue;
      this.lastTransferSeq = transfer.seq;
      if (hydrating) continue;
      const from = this.slots.get(transfer.from);
      const to = this.slots.get(transfer.to);
      if (from === undefined || to === undefined) continue;
      this.send(from, to, transfer.kind, packetCount(transfer.bytes), false);
    }
    this.reportPresence();
  }

  private createBody(id: string, parentId: string | null, root: boolean, hydrating: boolean) {
    const parentSlot = parentId !== null ? this.slots.get(parentId) : undefined;
    // A new root adopts an orphaned root body: same place, same particles, no jump.
    if (root) {
      for (const [orphanId, slot] of this.slots) {
        const body = this.bodies[slot]!;
        if (!body.root || body.phase === "returning") continue;
        this.slots.delete(orphanId);
        this.slots.set(id, slot);
        body.id = id;
        body.parentId = parentId;
        return slot;
      }
    }
    let slot = this.bodies.findIndex((b) => b === null);
    if (slot < 0) slot = this.bodies.length;
    const parent = parentSlot !== undefined ? this.bodies[parentSlot]! : null;
    const body: Body = {
      id,
      parentId,
      root,
      frame: parent ? { ...parent.frame, radius: parent.frame.radius * 0.3 } : { x: 0, y: 0, radius: 0 },
      velocity: { x: 0, y: 0, radius: 0 },
      placed: false,
      presence: 0,
      weights: new Float64Array(POSE_COUNT),
      from: new Float64Array(POSE_COUNT),
      pose: 0,
      morphAt: -Infinity,
      angles: new Float64Array(3),
      tone: "idle",
      base: [...this.tones.idle.base],
      accent: [...this.tones.idle.accent],
      alpha: this.tones.idle.alpha,
      phase: "resident",
      returnTo: null,
      holdUntil: 0,
      offset: fract(slot * 0.618 + 0.17) * 40,
      cos: new Float64Array(3),
      sin: new Float64Array(3),
      tilt: new Float64Array(4),
      active: [],
      spin: 1,
      wander: 1,
      density: 1,
      resident: 0,
    };
    body.weights[0] = 1;
    this.bodies[slot] = body;
    this.slots.set(id, slot);
    if (!parent) {
      // The first body takes every particle not yet owned.
      for (let i = 0; i < this.capacity; i++) if (this.owner[i] < 0) this.owner[i] = slot;
    } else {
      const cohort = clamp(Math.round(this.active * 0.03), 120, 420);
      this.send(parentSlot!, slot, "spawn", cohort, hydrating);
    }
    return slot;
  }

  private morph(body: Body, pose: number, instant: boolean) {
    body.pose = pose;
    if (instant || this.still) {
      body.weights.fill(0);
      body.weights[pose] = 1;
      body.morphAt = -Infinity;
      return;
    }
    // A new morph starts from wherever the last one had reached.
    body.from.set(body.weights);
    body.morphAt = this.time;
  }

  /** Starts a flight of up to `count` particles; `instant` reassigns them in place. */
  private send(from: number, to: number, kind: FlightKind, count: number, instant: boolean) {
    const source = this.bodies[from]!;
    const target = this.bodies[to]!;
    const candidates: number[] = [];
    for (let i = 0; i < this.capacity; i++)
      if (this.owner[i] === from && this.flightOf[i] < 0) candidates.push(i);
    const floor = kind === "return" || kind === "handoff" ? 0 : source.root ? Math.round(this.active * 0.3) : 24;
    const take = Math.min(count, candidates.length - floor);
    if (take < 6 && kind !== "return" && kind !== "handoff") return;
    if (take <= 0) return;
    // A uniform sample, independent of seed rank, keeps every body's visible density honest.
    const offset = fract(this.time * 0.37 + to * 0.618);
    const seed = this.lattice.seed;
    candidates.sort((a, b) => fract(seed[a] * 7919.37 + offset) - fract(seed[b] * 7919.37 + offset));
    const members = Int32Array.from(candidates.slice(0, take));
    if (instant) {
      for (const i of members) this.owner[i] = to;
      return;
    }
    let slot = this.flights.findIndex((f) => f === null);
    if (slot < 0) slot = this.flights.length;
    const dx = target.frame.x - source.frame.x;
    const dy = target.frame.y - source.frame.y;
    const distance = Math.hypot(dx, dy);
    // A spawn waits a beat for its row to mount, so the train heads straight for it.
    let start = kind === "spawn" ? this.time + 0.12 : this.time;
    if (kind === "return" || kind === "handoff") start = Math.max(start, source.holdUntil);
    else if (kind === "result") source.holdUntil = this.time + 0.45;
    const flight: Flight = {
      kind,
      from,
      to,
      start,
      duration: clamp(0.55 + distance / 420, 0.9, 2.4),
      spread: clamp(0.25 + take * 0.004, 0.25, 0.9),
      members,
      bend: kind === "result" ? 0.6 : kind === "peer" ? 0.8 : 1,
      landAt: this.clock() + STILL_HOLD,
    };
    this.flights[slot] = flight;
    // Nearest particles leave first, so the train streams out of the facing side.
    const pos = this.lattice.dir;
    const ux = dx / (distance || 1);
    const uy = -dy / (distance || 1);
    const order = Array.from(members).sort(
      (a, b) => -(pos[a * 3] * ux + pos[a * 3 + 1] * uy) + (pos[b * 3] * ux + pos[b * 3 + 1] * uy),
    );
    order.forEach((i, rank) => {
      this.owner[i] = to;
      this.flightOf[i] = slot;
      this.depart[i] = start + (rank / Math.max(1, take - 1)) * flight.spread;
    });
  }

  // ---------------------------------------------------------------------------
  // Time: springs toward anchors, morphs, spin, and landing flights.

  /**
   * Advance by `dt` seconds of animation. Still (reduced-motion) frames
   * advance no animation time; their route markers land by the clock.
   */
  step(dt: number, still: boolean) {
    const wall = this.clock();
    if (still !== this.still) {
      this.still = still;
      if (still) for (const body of this.bodies) if (body) this.morph(body, body.pose, true);
    }
    this.time += dt;
    const t = this.time;
    for (const body of this.bodies) if (body) this.advanceBody(body, dt);
    for (let f = 0; f < this.flights.length; f++) {
      const flight = this.flights[f];
      if (!flight) continue;
      const landed = still ? wall >= flight.landAt : t >= flight.start + flight.spread + flight.duration;
      if (!landed) continue;
      for (const i of flight.members) if (this.flightOf[i] === f) this.flightOf[i] = -1;
      this.flights[f] = null;
    }
    this.releaseEmptyBodies();
  }

  /** The earliest wall-clock second a still frame changes by itself, if any. */
  nextStillChange(): number | null {
    let next: number | null = null;
    for (const flight of this.flights) if (flight && (next === null || flight.landAt < next)) next = flight.landAt;
    return next;
  }

  private targetFrame(body: Body): Frame | null {
    if (body.root) return this.anchors.primary ?? null;
    return this.anchors.agents?.[body.id] ?? this.anchors.overflow ?? null;
  }

  private advanceBody(body: Body, dt: number) {
    // A returning body holds its place until its last particle has left.
    const target = body.phase === "returning" ? body.frame : this.targetFrame(body);
    const goal = body.phase === "returning" ? null : (target ?? (body.parentId !== null ? this.bodyFrame(body.parentId) : null));
    const shown = target ? 1 : 0;
    body.presence = this.still || !body.placed ? shown : body.presence + (shown - body.presence) * (1 - Math.exp(-6 * dt));
    if (goal) {
      if (!body.placed || this.still) {
        if (target || !body.placed) Object.assign(body.frame, goal);
        body.velocity.x = body.velocity.y = body.velocity.radius = 0;
        body.placed = !!target || body.placed;
      } else {
        const omega = body.root ? ROOT_SPRING : SPRING;
        const decay = Math.exp(-omega * dt);
        for (const axis of ["x", "y", "radius"] as const) {
          const e = body.frame[axis] - goal[axis];
          const b = body.velocity[axis] + omega * e;
          body.frame[axis] = goal[axis] + (e + b * dt) * decay;
          body.velocity[axis] = (body.velocity[axis] - omega * b * dt) * decay;
        }
      }
    }
    if (body.morphAt > -Infinity) {
      const u = ease((this.time - body.morphAt) / MORPH_SECONDS);
      for (let k = 0; k < POSE_COUNT; k++) body.weights[k] = body.from[k] * (1 - u) + (k === body.pose ? u : 0);
      if (u >= 1) body.morphAt = -Infinity;
    }
    let spin = 0;
    let wander = 0;
    body.active.length = 0;
    for (let k = 0; k < POSE_COUNT; k++) {
      const w = body.weights[k];
      if (w < 1e-4) continue;
      body.active.push(k);
      spin += w * POSE_SPIN[k];
      wander += w * POSE_WANDER[k];
    }
    body.spin = spin;
    body.wander = wander;
    const turn = this.still ? 0 : dt * spin;
    for (let s = 0; s < 3; s++) {
      body.angles[s] += SHELL_SPEED[s] * turn;
      body.cos[s] = Math.cos(body.angles[s]);
      body.sin[s] = Math.sin(body.angles[s]);
    }
    const style = this.tones[body.tone];
    const k = this.still ? 1 : 1 - Math.exp(-3.2 * dt);
    for (let a = 0; a < 3; a++) {
      body.base[a] += (style.base[a] - body.base[a]) * k;
      body.accent[a] += (style.accent[a] - body.accent[a]) * k;
    }
    body.alpha += (style.alpha - body.alpha) * k;
  }

  private bodyFrame(id: string): Frame | null {
    const slot = this.slots.get(id);
    return slot === undefined ? null : this.bodies[slot]!.frame;
  }

  private releaseEmptyBodies() {
    let changed = false;
    for (const [id, slot] of this.slots) {
      const body = this.bodies[slot]!;
      if (body.phase !== "returning") continue;
      // A body stays until its last train lands: its particles fly from its pose.
      let holds = this.flights.some((flight) => flight !== null && flight.from === slot);
      let landed = false;
      for (let i = 0; i < this.capacity; i++) {
        if (this.owner[i] !== slot) continue;
        holds = true;
        if (this.flightOf[i] < 0) landed = true;
      }
      // Particles that arrived after the return left follow it.
      const onward = this.returnSlot(body);
      if (landed && onward !== undefined) this.send(slot, onward, "return", Infinity, false);
      if (holds) continue;
      this.slots.delete(id);
      this.bodies[slot] = null;
      changed = true;
    }
    if (changed) this.reportPresence();
  }

  /** Where a returning body's particles go: its destination, or the root if that has gone too. */
  private returnSlot(body: Body) {
    const direct = body.returnTo !== null ? this.slots.get(body.returnTo) : undefined;
    if (direct !== undefined && this.bodies[direct]!.phase === "resident") return direct;
    for (const [, slot] of this.slots) if (this.bodies[slot]!.root && this.bodies[slot]!.phase === "resident") return slot;
    return direct;
  }

  private reportPresence() {
    const ids = [...this.slots.keys()].sort();
    const key = ids.join("\n");
    if (key === this.presenceKey) return;
    this.presenceKey = key;
    this.onPresence?.(ids);
  }

  snapshot(): SubstrateSnapshot {
    const resident = new Map<number, number>();
    let inFlight = 0;
    let unowned = 0;
    for (let i = 0; i < this.capacity; i++) {
      if (this.owner[i] < 0) unowned++;
      else if (this.flightOf[i] >= 0) inFlight++;
      else resident.set(this.owner[i], (resident.get(this.owner[i]) ?? 0) + 1);
    }
    return {
      bodies: [...this.slots].map(([agentId, slot]) => ({
        agentId,
        phase: this.bodies[slot]!.phase,
        resident: resident.get(slot) ?? 0,
      })),
      inFlight,
      unowned,
    };
  }

  // ---------------------------------------------------------------------------
  // Drawing: one pass over the particles into the renderer's buffers.

  /**
   * Writes every particle for a stage `width` × `height` CSS pixels whose
   * world-space height is `worldHeight` (camera at the origin's z axis).
   * `tiltX`/`tiltY` lean the root globe toward the pointer.
   */
  write(out: ParticleBuffers, width: number, height: number, worldHeight: number, tiltX = 0, tiltY = 0) {
    const unit = worldHeight / height;
    const t = this.still ? STILL_TIME : this.time;
    const counts = new Int32Array(this.bodies.length);
    for (let i = 0; i < this.active; i++) if (this.owner[i] >= 0 && this.flightOf[i] < 0) counts[this.owner[i]]++;
    for (let s = 0; s < this.bodies.length; s++) {
      const body = this.bodies[s];
      if (!body) continue;
      body.resident = counts[s];
      const small = smallness(body.frame.radius);
      // Small globes keep more of their particles visible, so a row's globe still reads as a globe.
      body.density = Math.min(1, (body.frame.radius * body.frame.radius * DENSITY * (1 + 1.6 * small)) / Math.max(1, counts[s]));
      const time = this.still ? 0 : this.time + body.offset;
      const lean = body.root ? 1 : 0;
      this.setTilt(body, tiltX * lean + small * 0.45 * Math.sin(time * 0.29), tiltY * lean + small * 0.36 * Math.sin(time * 0.21 + 1));
    }
    const { position, color, params } = out;
    const seed = this.lattice.seed;
    const sample = this.sample;
    for (let i = 0; i < this.capacity; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      params[i4 + 3] = seed[i];
      const slot = this.owner[i];
      if (i >= this.active || slot < 0) {
        params[i4] = 0;
        continue;
      }
      const f = this.flightOf[i];
      if (f < 0) {
        const body = this.bodies[slot]!;
        const visible = this.visibility(body, seed[i]);
        if (visible <= 0) {
          params[i4] = 0;
          continue;
        }
        this.place(body, i, t, unit, width, height, sample, 0);
        position[i3] = sample[0];
        position[i3 + 1] = sample[1];
        position[i3 + 2] = sample[2];
        color[i3] = sample[5];
        color[i3 + 1] = sample[6];
        color[i3 + 2] = sample[7];
        params[i4] = sample[3] * visible;
        params[i4 + 1] = sample[4];
        params[i4 + 2] = sample[8];
        continue;
      }
      this.placeInFlight(this.flights[f]!, i, t, unit, width, height);
      position[i3] = sample[0];
      position[i3 + 1] = sample[1];
      position[i3 + 2] = sample[2];
      color[i3] = sample[5];
      color[i3 + 1] = sample[6];
      color[i3 + 2] = sample[7];
      params[i4] = sample[3];
      params[i4 + 1] = sample[4];
      params[i4 + 2] = sample[8];
    }
  }

  /** 0–1: whether a resident particle shows at its body's density, as the site's globe thins small orbs. */
  private visibility(body: Body, seed: number) {
    const edge = Math.min(0.08, Math.max(0.002, body.density * 0.2));
    return clamp((body.density - seed) / edge, 0, 1) * body.presence;
  }

  private setTilt(body: Body, ax: number, ay: number) {
    body.tilt[0] = Math.cos(ax);
    body.tilt[1] = Math.sin(ax);
    body.tilt[2] = Math.cos(ay);
    body.tilt[3] = Math.sin(ay);
  }

  /**
   * One resident particle of `body`, into `out[o..o+8]`: world x, y, z, alpha,
   * size, r, g, b and local depth (-1 far, 1 near).
   */
  private place(body: Body, i: number, t: number, unit: number, width: number, height: number, out: Float64Array, o: number) {
    const { dir, radial, shell } = this.lattice;
    const i3 = i * 3;
    const s = shell[i];
    const c = body.cos[s];
    const sn = body.sin[s];
    const dx = dir[i3] * c + dir[i3 + 2] * sn;
    const dy = dir[i3 + 1];
    const dz = -dir[i3] * sn + dir[i3 + 2] * c;
    const seed = this.lattice.seed[i];
    const poseTime = t + body.offset;
    let x = 0;
    let y = 0;
    let z = 0;
    let energy = 0;
    let alpha = 0;
    let magnitude = 0;
    const p = this.scratch;
    for (const k of body.active) {
      const w = body.weights[k];
      writePose(k, dx, dy, dz, radial[i], s, seed, poseTime, p, 0);
      x += w * p[0];
      y += w * p[1];
      z += w * p[2];
      energy += w * p[3];
      alpha += w * p[4];
      magnitude += w * Math.hypot(p[0], p[1], p[2]);
    }
    // The outer shell keeps its radius through every blend, so the globe never collapses mid-morph.
    if (s === 0) {
      const length = Math.hypot(x, y, z);
      if (length > 0.15) {
        const k = magnitude / length;
        x *= k;
        y *= k;
        z *= k;
      }
    }
    const [bcx, bsx, bcy, bsy] = body.tilt;
    const tx = x * bcy + z * bsy;
    const tz = -x * bsy + z * bcy;
    let localY = y * bcx - tz * bsx;
    let localZ = y * bsx + tz * bcx;
    let localX = tx;
    const small = smallness(body.frame.radius);
    const lively = small * body.wander;
    let twinkle = 0;
    if (lively > 0 && !this.still) {
      const amount = lively * 0.06;
      const r = Math.hypot(localX, localY, localZ) || 1;
      localX += amount * r * Math.sin(t * (0.5 + seed * 0.7) + seed * 40);
      localY += amount * r * Math.cos(t * (0.45 + seed * 0.6) + seed * 23);
      localZ += amount * r * Math.sin(t * (0.55 + seed * 0.5) + seed * 61);
      twinkle = lively * (0.5 + 0.5 * Math.sin(t * (0.6 + seed * 0.8) + seed * 17));
    }
    const radius = body.frame.radius * unit;
    out[o] = (body.frame.x - width / 2) * unit + localX * radius;
    out[o + 1] = (height / 2 - body.frame.y) * unit + localY * radius;
    out[o + 2] = localZ * radius;
    energy = clamp(energy, 0, 1);
    const lift = this.darkLift * small;
    out[o + 3] = clamp(body.alpha * alpha * (1 - 0.3 * twinkle) * (1 + 0.5 * energy) * (1 + 0.35 * lift), 0, 1);
    const size = Math.max(0.5 + 0.12 * lift, Math.min(1, body.frame.radius / 160));
    out[o + 4] = size * (1 + 0.45 * energy) * (1 + 0.25 * (twinkle - 0.5 * small));
    const tone = this.lattice.accentMask[i] ? body.accent : body.base;
    const glow = energy * 0.9;
    out[o + 5] = tone[0] + (this.glow[0] - tone[0]) * glow;
    out[o + 6] = tone[1] + (this.glow[1] - tone[1]) * glow;
    out[o + 7] = tone[2] + (this.glow[2] - tone[2]) * glow;
    // Depth within the globe in its unit space, as the site's depth cue measures it.
    out[o + 8] = clamp(localZ, -1.2, 1.2) / 1.1;
  }

  /** A particle in flight, into `sample[0..8]`: a curved route between its poses in both bodies. */
  private placeInFlight(flight: Flight, i: number, t: number, unit: number, width: number, height: number) {
    const sample = this.sample;
    const from = this.bodies[flight.from];
    const to = this.bodies[flight.to]!;
    let local: number;
    if (this.still) {
      // Reduced motion: a still dotted route from source to destination, then a snap on landing.
      const rank = clamp((this.depart[i] - flight.start) / Math.max(1e-3, flight.spread), 0, 1);
      local = 0.12 + rank * 0.76;
    } else local = (this.time - this.depart[i]) / flight.duration;
    if (!from || local >= 1) {
      this.place(to, i, t, unit, width, height, sample, 0);
      if (local < 1) sample[3] *= clamp(local * 4, 0, 1);
      return;
    }
    if (local <= 0) {
      this.place(from, i, t, unit, width, height, sample, 0);
      sample[3] = Math.max(sample[3] * this.visibility(from, this.lattice.seed[i]), 0);
      return;
    }
    this.place(from, i, t, unit, width, height, sample, 0);
    this.place(to, i, t, unit, width, height, sample, 9);
    const u = this.still ? local : ease(local);
    const q = 1 - u;
    // Bend to the left of the column (or upward on level routes), each kind in its own lane.
    const ax = sample[0];
    const ay = sample[1];
    const bx = sample[9];
    const by = sample[10];
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy) || 1;
    let nx = -dy / length;
    let ny = dx / length;
    if (nx > 0.05 || (Math.abs(nx) <= 0.05 && ny < 0)) {
      nx = -nx;
      ny = -ny;
    }
    const bend = clamp(length * 0.34, 18 * unit, 120 * unit) * flight.bend;
    const halfWidth = width / 2;
    let cx = (ax + bx) / 2 + nx * bend;
    cx = Math.max(cx, (-halfWidth + 6) * unit);
    const cy = (ay + by) / 2 + ny * bend;
    const cz = (sample[2] + sample[11]) * 0.25;
    const seed = this.lattice.seed[i];
    const lane = (fract(seed * 97.13) - 0.5) * 7 * unit * Math.sin(Math.PI * u);
    sample[0] = q * q * ax + 2 * q * u * cx + u * u * bx - ny * lane;
    sample[1] = q * q * ay + 2 * q * u * cy + u * u * by + nx * lane;
    sample[2] = q * q * sample[2] + 2 * q * u * cz + u * u * sample[11];
    const leave = smoothstep(local / 0.15);
    const arrive = smoothstep((local - 0.85) / 0.15);
    const fromAlpha = sample[3] * this.visibility(from, seed);
    const toAlpha = sample[12] * this.visibility(to, seed);
    sample[3] = fromAlpha + (1 - fromAlpha) * leave + (toAlpha - 1) * arrive;
    // In the air a particle is a little larger than at rest, so a train reads at row scale.
    const resting = sample[4] * q + sample[13] * u;
    sample[4] = resting + (Math.max(0.8, resting) * 1.3 - resting) * Math.sin(Math.PI * u);
    const tint = this.tint(flight.kind, this.lattice.accentMask[i] === 1);
    const glow = Math.sin(Math.PI * u) * (tint ? 0.85 : 0);
    for (let k = 0; k < 3; k++) {
      const tone = sample[5 + k] * q + sample[14 + k] * u;
      sample[5 + k] = tint ? tone + (tint[k] - tone) * glow : tone;
    }
    sample[8] = sample[8] * q + sample[17] * u;
  }

  /** Colour a train takes in the air: results and peer messages glow red, briefs and steers stay ink. */
  private tint(kind: FlightKind, accent: boolean): readonly number[] | null {
    switch (kind) {
      case "result":
      case "peer":
        return this.glow;
      case "brief":
      case "steer":
      case "spawn":
        return accent ? this.glow : this.ink;
      default:
        return null;
    }
  }
}
