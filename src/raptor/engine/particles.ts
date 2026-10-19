import type { HomeFrame } from "../home/journey.ts";
import type { ClusterTarget, Vec3 } from "./layout.ts";
import { ACCENT_RATIO, ON_DARK, STREAM, TONES } from "./palette.ts";
import type { ToneStyle } from "./palette.ts";

/**
 * Particle simulation, independent of WebGL. Each particle belongs to one
 * cluster, keeps a fixed lattice position inside whichever cluster owns it,
 * and springs toward that position. Reassignments are staggered so particles
 * stream between clusters rather than teleporting.
 */

// A crisp outer surface over a volumetric interior; inner layers counter-rotate.
const SHELLS = [
  { fraction: 0.7, inner: 0.975, outer: 1.0, speed: 0.11 },
  { fraction: 0.22, inner: 0.36, outer: 0.84, speed: -0.08 },
  { fraction: 0.08, inner: 0.08, outer: 0.3, speed: 0.15 },
];
const MAX_SLOTS = 96;
/** Share of a dissolve or gather each particle spends in flight. */
const FLOW_WINDOW = 0.42;
/** The river's height as a multiple of the viewport; it overhangs top and bottom. */
const RIVER_SPAN = 1.24;
const fract = (n: number) => n - Math.floor(n);
/**
 * A particle's share of the way through a dissolve or gather at overall progress `t`. Particles on
 * the river's (right-hand) side go first, mixed with a seeded scatter, so orbs erode from that side.
 */
const departure = (t: number, dirX: number, seed: number) =>
  smoothstep((t - ((1 - dirX) / 2 * 0.6 + seed * 0.4) * (1 - FLOW_WINDOW)) / FLOW_WINDOW);
const smoothstep = (n: number) => { const t = Math.max(0, Math.min(1, n)); return t * t * (3 - 2 * t); };
/** Small orbs (the docked coordinator, rail marker and worker icons) get visible life. */
const smallness = (radius: number) => Math.max(0, Math.min(1, (70 - radius) / 40));
/** Small orbs (rail markers and worker icons), which sit over dark sections, take the on-dark tone. */
const warmthOf = (radius: number) => Math.max(0, Math.min(1, (40 - radius) / 20));
const STIFFNESS = 16;

type Cluster = {
  key: string;
  kind: ClusterTarget["kind"];
  inLayout: boolean;
  releaseAt: number;
  count: number;
  share: number;
  sourceKey: string | null;
  gather: number;
  center: Vec3;
  targetCenter: Vec3;
  radius: number;
  targetRadius: number;
  style: ToneStyle;
  base: Vec3;
  accent: Vec3;
  activity: number;
  alpha: number;
  size: number;
  flatten: { nx: number; ny: number; amount: number };
  targetFlatten: number;
  pulse: number;
  flash: number;
  phase: number;
  angles: [number, number, number];
  // Per-frame scratch
  cos: [number, number, number];
  sin: [number, number, number];
  breath: number;
  pulseNow: number;
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

export class ParticleField {
  readonly capacity: number;
  active: number;
  readonly position: Float32Array;
  readonly color: Float32Array;
  readonly params: Float32Array;
  private velocity: Float32Array;
  private dir: Float32Array;
  private shell: Uint8Array;
  private radial: Float32Array;
  private seed: Float32Array;
  private accentMask: Uint8Array;
  private colorState: Float32Array;
  private slot: Int16Array;
  private prevSlot: Int16Array;
  private switchAt: Float32Array;
  private clusters: (Cluster | null)[] = [];
  private keyToSlot = new Map<string, number>();
  private time = 0;
  private homeCos = new Float32Array(3);
  private homeSin = new Float32Array(3);
  // Per-body tilt (cos/sin x, cos/sin y): one per satellite, the mother, and the flow's two ends.
  private homeTilt = new Float32Array(4 * 53);
  // Scratch for one particle: mother, flow source, flow destination and blended result, 8 values each.
  private body = new Float32Array(32);

  constructor(capacity: number) {
    this.capacity = capacity;
    this.active = capacity;
    this.position = new Float32Array(capacity * 3);
    this.velocity = new Float32Array(capacity * 3);
    this.color = new Float32Array(capacity * 3);
    this.colorState = new Float32Array(capacity * 3);
    this.params = new Float32Array(capacity * 4);
    this.dir = new Float32Array(capacity * 3);
    this.shell = new Uint8Array(capacity);
    this.radial = new Float32Array(capacity);
    this.seed = new Float32Array(capacity);
    this.accentMask = new Uint8Array(capacity);
    this.slot = new Int16Array(capacity).fill(-1);
    this.prevSlot = new Int16Array(capacity).fill(-1);
    this.switchAt = new Float32Array(capacity);
    this.generateLattice();
  }

  /** Fibonacci shells, shuffled so any prefix is an even subsample. */
  private generateLattice() {
    const random = mulberry32(0x7a105);
    const entries: [number, number, number][] = [];
    SHELLS.forEach((shell, s) => {
      const count = Math.round(this.capacity * shell.fraction);
      for (let k = 0; k < count; k++) entries.push([s, k, count]);
    });
    while (entries.length < this.capacity) entries.push([0, entries.length, this.capacity]);
    entries.length = this.capacity;
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < this.capacity; i++) {
      const [s, k, count] = entries[i];
      const y = 1 - (2 * (k + 0.5)) / count;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * k + s * 1.3;
      this.dir[i * 3] = Math.cos(theta) * r;
      this.dir[i * 3 + 1] = y;
      this.dir[i * 3 + 2] = Math.sin(theta) * r;
      // Volume-uniform radius within the layer, so interiors have no hard edge.
      const { inner, outer } = SHELLS[s];
      this.radial[i] = Math.cbrt(inner ** 3 + random() * (outer ** 3 - inner ** 3));
      this.shell[i] = s;
      this.seed[i] = random();
      this.accentMask[i] = random() < ACCENT_RATIO ? 1 : 0;
      // Start collapsed so the first frames read as the agent assembling.
      const start = 0.08 + random() * 0.18;
      this.position[i * 3] = this.dir[i * 3] * start;
      this.position[i * 3 + 1] = this.dir[i * 3 + 1] * start;
      this.position[i * 3 + 2] = this.dir[i * 3 + 2] * start;
    }
  }

  private createCluster(target: ClusterTarget): Cluster {
    const style = TONES[target.tone];
    return {
      key: target.key,
      kind: target.kind,
      inLayout: true,
      releaseAt: 0,
      count: 0,
      share: target.share,
      sourceKey: target.sourceKey,
      gather: target.gather,
      center: [...target.center],
      targetCenter: [...target.center],
      radius: target.radius,
      targetRadius: target.radius,
      style,
      base: [...style.base],
      accent: [...style.accent],
      activity: style.activity,
      alpha: style.alpha,
      size: style.size,
      flatten: target.flatten ? { ...target.flatten } : { nx: 1, ny: 0, amount: 0 },
      targetFlatten: target.flatten?.amount ?? 0,
      pulse: target.tone === "action-awaiting" ? 1 : 0,
      flash: 0,
      phase: this.clusters.length * 1.7,
      angles: [0, 0, 0],
      cos: [1, 1, 1],
      sin: [0, 0, 0],
      breath: 1,
      pulseNow: 1,
    };
  }

  /** Apply new layout targets and reassign particles to match shares. */
  setTargets(targets: ClusterTarget[]) {
    const seen = new Set<string>();
    for (const target of targets) {
      seen.add(target.key);
      let slot = this.keyToSlot.get(target.key);
      if (slot === undefined) {
        slot = this.clusters.findIndex((c) => c === null);
        if (slot < 0) slot = this.clusters.length;
        if (slot >= MAX_SLOTS) continue;
        const cluster = this.createCluster(target);
        // New clusters appear where their particles come from.
        const source = target.sourceKey !== null ? this.cluster(target.sourceKey) : null;
        if (source) {
          cluster.center = [...source.center];
          cluster.radius = target.kind === "agent" ? source.radius * 0.6 : target.radius;
        }
        this.clusters[slot] = cluster;
        this.keyToSlot.set(target.key, slot);
      }
      const c = this.clusters[slot]!;
      const style = TONES[target.tone];
      c.inLayout = true;
      c.kind = target.kind;
      c.share = target.share;
      c.sourceKey = target.sourceKey;
      c.gather = target.gather;
      c.targetCenter = [...target.center];
      c.targetRadius = target.radius;
      c.style = style;
      c.pulse = target.tone === "action-awaiting" ? 1 : 0;
      if (target.flatten) {
        c.flatten.nx = target.flatten.nx;
        c.flatten.ny = target.flatten.ny;
      }
      c.targetFlatten = target.flatten?.amount ?? 0;
    }
    for (const c of this.clusters)
      if (c && !seen.has(c.key) && c.inLayout) {
        c.inLayout = false;
        c.share = 0;
        c.releaseAt = this.time + 1.4;
      }
    this.allocate();
  }

  cluster(key: string): Cluster | null {
    const slot = this.keyToSlot.get(key);
    return slot === undefined ? null : this.clusters[slot];
  }

  /** Read-only access to smoothed cluster geometry, for threads and the ring. */
  geometry(key: string) {
    const c = this.cluster(key);
    return c ? { center: c.center, radius: c.radius * c.breath } : null;
  }

  setActive(count: number) {
    const next = Math.min(this.capacity, Math.max(256, Math.round(count)));
    if (next === this.active) return;
    if (next > this.active)
      for (let i = this.active; i < next; i++) this.slot[i] = this.prevSlot[i] = -1;
    this.active = next;
    this.allocate();
  }

  private allocate() {
    const n = this.active;
    const counts = new Array<number>(this.clusters.length).fill(0);
    for (let i = 0; i < n; i++) if (this.slot[i] >= 0) counts[this.slot[i]]++;
    const desired = this.clusters.map((c) => (c && c.inLayout ? Math.round(c.share * n) : 0));
    // The largest cluster absorbs rounding so totals match exactly.
    let largest = -1;
    desired.forEach((d, s) => {
      if (largest < 0 || d > desired[largest]) largest = s;
    });
    if (largest >= 0) desired[largest] += n - desired.reduce((a, b) => a + b, 0);

    const surplus = (s: number) => counts[s] - desired[s];
    // Unassigned particles (first layout, or newly activated) form a free pool.
    const free: number[] = [];
    for (let i = 0; i < n; i++) if (this.slot[i] < 0) free.push(i);

    const order = this.clusters
      .map((_, s) => s)
      .filter((s) => this.clusters[s] && desired[s] > counts[s])
      .sort((a, b) => (a === largest ? 1 : b === largest ? -1 : a - b));

    for (const receiver of order) {
      const target = this.clusters[receiver]!;
      let deficit = desired[receiver] - counts[receiver];
      const moved: number[] = [];
      while (deficit > 0 && free.length) {
        const i = free.pop()!;
        this.slot[i] = this.prevSlot[i] = receiver;
        this.switchAt[i] = 0;
        counts[receiver]++;
        deficit--;
      }
      while (deficit > 0) {
        const preferred = target.sourceKey !== null ? this.keyToSlot.get(target.sourceKey) : undefined;
        let donor = preferred !== undefined && surplus(preferred) > 0 ? preferred : -1;
        if (donor < 0) {
          let best = 0;
          counts.forEach((_, s) => {
            if (s !== receiver && surplus(s) > best) {
              best = surplus(s);
              donor = s;
            }
          });
        }
        if (donor < 0) break;
        const take = Math.min(deficit, surplus(donor));
        const candidates: number[] = [];
        for (let i = 0; i < n; i++) if (this.slot[i] === donor) candidates.push(i);
        // An even subsample keeps the donor's structure intact.
        const offset = (receiver * 0.618) % 1;
        candidates.sort(
          (a, b) => ((this.seed[a] + offset) % 1) - ((this.seed[b] + offset) % 1),
        );
        for (let k = 0; k < take; k++) {
          const i = candidates[k];
          this.prevSlot[i] = donor;
          this.slot[i] = receiver;
          moved.push(i);
        }
        counts[donor] -= take;
        counts[receiver] += take;
        deficit -= take;
      }
      // Nearest particles leave first, so arrivals read as a stream.
      if (moved.length) {
        const c = target.targetCenter;
        const dist = (i: number) =>
          (this.position[i * 3] - c[0]) ** 2 + (this.position[i * 3 + 1] - c[1]) ** 2;
        moved.sort((a, b) => dist(a) - dist(b));
        moved.forEach((i, rank) => {
          this.switchAt[i] = this.time + (rank / moved.length) * target.gather;
        });
      }
    }
    this.clusters.forEach((c, s) => {
      if (c) c.count = counts[s];
    });
  }

  flash(key: string, strength: number) {
    const c = this.cluster(key);
    if (c) c.flash = Math.max(c.flash, strength);
  }

  /** Short controlled bloom: particles kick outward, then settle. */
  bloom(key: string) {
    const slot = this.keyToSlot.get(key);
    if (slot === undefined) return;
    const c = this.clusters[slot]!;
    c.flash = 0.9;
    const nx = c.flatten.nx;
    const ny = c.flatten.ny;
    for (let i = 0; i < this.active; i++) {
      if (this.slot[i] !== slot) continue;
      const dx = this.position[i * 3] - c.center[0];
      const dy = this.position[i * 3 + 1] - c.center[1];
      const dz = this.position[i * 3 + 2] - c.center[2];
      const len = Math.hypot(dx, dy, dz) || 1;
      const kick = 0.9 + this.seed[i] * 0.8;
      this.velocity[i * 3] += (dx / len) * kick + nx * 1.4;
      this.velocity[i * 3 + 1] += (dy / len) * kick + ny * 1.4;
      this.velocity[i * 3 + 2] += (dz / len) * kick;
    }
  }

  /** Fixed cohorts morph from their original lattice without changing event ownership. */
  stepHome(frame: HomeFrame, width: number, height: number, worldHeight: number, time: number, tiltX = 0, tiltY = 0) {
    const unit = worldHeight / height;
    for (let shell = 0; shell < SHELLS.length; shell++) {
      this.homeCos[shell] = Math.cos(time * SHELLS[shell].speed);
      this.homeSin[shell] = Math.sin(time * SHELLS[shell].speed);
    }
    const bodies = frame.satellites.length;
    const small = smallness(frame.mother.radius);
    // A slow precession shows the poles, so the spin reads as 3D. Satellites ease from the mother's into their own.
    const motherX = small * 0.45 * Math.sin(time * 0.29);
    const motherY = small * 0.36 * Math.sin(time * 0.21 + 1);
    for (let b = 0; b <= bodies; b++) {
      const mix = b < bodies ? frame.satellites[b].mix : 0;
      const ax = tiltX + motherX + (0.3 * Math.sin(time * 0.29 + (b + 1) * 1.7) - motherX) * mix;
      const ay = tiltY + motherY + (0.24 * Math.sin(time * 0.21 + (b + 1) * 2.3 + 1) - motherY) * mix;
      this.setTilt(b, ax, ay);
    }
    const warmth = Math.max(frame.warm, warmthOf(frame.mother.radius), 0);

    // The stream: the hero orb dissolves into a river down the right gutter, which gathers into the
    // release orb at the end. Everything below is a pure function of the eased scroll state.
    const flow = frame.flow;
    const flowing = flow.weight > 0.0005;
    let smallFrom = 0;
    let smallTo = 0;
    let warmFrom = 0;
    let warmTo = 0;
    let riverDensity = 0;
    if (flowing) {
      smallFrom = smallness(flow.from.radius);
      smallTo = smallness(flow.to.radius);
      warmFrom = Math.max(flow.warmFrom, warmthOf(flow.from.radius), 0);
      warmTo = Math.max(flow.warmTo, warmthOf(flow.to.radius), 0);
      this.setTilt(bodies + 1, tiltX + smallFrom * 0.45 * Math.sin(time * 0.29), tiltY + smallFrom * 0.36 * Math.sin(time * 0.21 + 1));
      this.setTilt(bodies + 2, smallTo * 0.45 * Math.sin(time * 0.29), smallTo * 0.36 * Math.sin(time * 0.21 + 1));
      // A sparse river: about one visible particle per 20 square pixels of its band.
      riverDensity = Math.min(1, (height * RIVER_SPAN * flow.river.width * 2) / 20 / this.active);
    }

    const body = this.body;
    for (let i = 0; i < this.active; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      const cohort = i % 50;
      const satellite = frame.satellites[cohort];
      const mix = satellite?.mix ?? 0;
      const mother = frame.mother;
      const seed = this.seed[i];
      let slot = 0;
      if (!flowing || flow.weight < 1) {
        const target = satellite?.frame ?? mother;
        const x = mother.x + (target.x - mother.x) * mix;
        const y = mother.y + (target.y - mother.y) * mix;
        const radius = mother.radius + (target.radius - mother.radius) * mix;
        this.place(0, i, x, y, radius, satellite ? cohort : bodies, small, mix, cohort, warmth, time, unit, width, height);
      }
      if (flowing) {
        this.river(16, i, flow, riverDensity, time, unit, width, height);
        const leaving = flow.dissolve < 1 ? departure(flow.dissolve, this.dir[i3], seed) : 1;
        const arriving = flow.gather > 0 ? departure(flow.gather, this.dir[i3], seed) : 0;
        if (leaving < 1) {
          // Dissolve: from the hero orb out to the river, sweeping right before falling into the flow.
          this.place(8, i, flow.from.x, flow.from.y, flow.from.radius, bodies + 1, smallFrom, 0, cohort, warmFrom, time, unit, width, height);
          this.travel(8, 16, leaving, 0.85, 0.15, false, i);
        } else if (arriving > 0) {
          // Gather: out of the river into the release orb, falling first and then sweeping in.
          this.place(8, i, flow.to.x, flow.to.y, flow.to.radius, bodies + 2, smallTo, 0, cohort, warmTo, time, unit, width, height);
          this.travel(16, 8, arriving, 0.15, 0.85, true, i);
        } else {
          for (let k = 0; k < 8; k++) body[24 + k] = body[16 + k];
        }
        if (mix > 0 && satellite) {
          // Docked marks (workers, principles, coordinator, console) peel off the passing stream.
          this.place(8, i, satellite.frame.x, satellite.frame.y, satellite.frame.radius, cohort, 1, mix, cohort, 1, time, unit, width, height);
          const k = smoothstep(mix);
          for (let j = 0; j < 8; j++) body[24 + j] += (body[8 + j] - body[24 + j]) * k;
        }
        if (flow.weight < 1) {
          for (let k = 0; k < 8; k++) body[24 + k] = body[k] + (body[24 + k] - body[k]) * flow.weight;
        }
        slot = 24;
      }
      this.position[i3] = body[slot];
      this.position[i3 + 1] = body[slot + 1];
      this.position[i3 + 2] = body[slot + 2];
      this.color[i3] = body[slot + 5];
      this.color[i3 + 1] = body[slot + 6];
      this.color[i3 + 2] = body[slot + 7];
      this.params[i4] = TONES.idle.alpha * frame.opacity * body[slot + 3];
      this.params[i4 + 1] = body[slot + 4];
      this.params[i4 + 2] = 0;
      this.params[i4 + 3] = seed;
    }
  }

  /** The particle's place in the river, which flows down the viewport as the page scrolls. */
  private river(out: number, i: number, flow: HomeFrame["flow"], density: number, time: number, unit: number, width: number, height: number) {
    const body = this.body;
    const seed = this.seed[i];
    const band = flow.river.width;
    // Evenly spaced along the river; scrolling a viewport carries particles 0.7 of a viewport down it,
    // and a slow drift keeps it moving at rest. The river overhangs both edges, so wrapping is unseen.
    const u = fract(i * 0.6180339 + (flow.phase / (height * RIVER_SPAN)) * 0.7 + time * 0.012);
    const y = height * (u * RIVER_SPAN - (RIVER_SPAN - 1) / 2);
    const meander = band * 0.55 * Math.sin((y / height) * 5.2 + (flow.phase / height) * 1.6 + 0.6);
    const lateral = (fract(seed * 97.13) - 0.5) * 2 * band + Math.sin(time * 0.7 + seed * 30) * band * 0.12;
    body[out] = (flow.river.x + meander + lateral - width / 2) * unit;
    body[out + 1] = (height / 2 - y) * unit;
    body[out + 2] = (fract(seed * 61.7 + 0.3) - 0.5) * band * 2 * unit;
    body[out + 3] = Math.max(0, Math.min(1, (density - seed) / 0.02));
    body[out + 4] = 0.9;
    const c = this.accentMask[i] ? STREAM.accent : STREAM.base;
    body[out + 5] = c[0];
    body[out + 6] = c[1];
    body[out + 7] = c[2];
  }

  /**
   * Moves a particle `p` of the way from `a` to `b` (body offsets) into the result slot, on a curve
   * that covers `bendX` of the horizontal and `bendY` of the vertical distance by its midpoint.
   * Arrivals fade in early; departures thin out late, so the stream keeps its body.
   */
  private travel(a: number, b: number, p: number, bendX: number, bendY: number, arriving: boolean, i: number) {
    const body = this.body;
    const q = 1 - p;
    const cx = body[a] + (body[b] - body[a]) * bendX;
    const cy = body[a + 1] + (body[b + 1] - body[a + 1]) * bendY;
    const cz = (body[a + 2] + body[b + 2]) / 2;
    body[24] = q * q * body[a] + 2 * q * p * cx + p * p * body[b];
    body[25] = q * q * body[a + 1] + 2 * q * p * cy + p * p * body[b + 1];
    body[26] = q * q * body[a + 2] + 2 * q * p * cz + p * p * body[b + 2];
    const fade = arriving ? smoothstep(p / 0.45) : smoothstep((p - 0.55) / 0.45);
    for (let k = 3; k < 5; k++) body[24 + k] = body[a + k] + (body[b + k] - body[a + k]) * fade;
    // In flight, particles take the stream tone to read over light and dark sections.
    const glow = Math.sin(Math.PI * p);
    const stream = this.accentMask[i] ? STREAM.accent : STREAM.base;
    for (let k = 5; k < 8; k++) {
      const tone = body[a + k] + (body[b + k] - body[a + k]) * p;
      body[24 + k] = tone + (stream[k - 5] - tone) * glow;
    }
  }

  private setTilt(index: number, ax: number, ay: number) {
    const o = index * 4;
    this.homeTilt[o] = Math.cos(ax);
    this.homeTilt[o + 1] = Math.sin(ax);
    this.homeTilt[o + 2] = Math.cos(ay);
    this.homeTilt[o + 3] = Math.sin(ay);
  }

  /**
   * One particle on a sphere centred at (x, y) CSS pixels: writes world position, alpha (before page
   * opacity), size and colour into `body` from `out`.
   */
  private place(out: number, i: number, x: number, y: number, radiusPx: number, tilt: number, small: number, mix: number,
    cohort: number, warmth: number, time: number, unit: number, width: number, height: number) {
    const i3 = i * 3;
    const body = this.body;
    const radius = radiusPx * unit;
    const angle = time * 0.38 * mix;
    const cosOffset = Math.cos(angle);
    const sinOffset = Math.sin(angle);
    const shellCos = this.homeCos[this.shell[i]];
    const shellSin = this.homeSin[this.shell[i]];
    const cos = shellCos * cosOffset - shellSin * sinOffset;
    const sin = shellSin * cosOffset + shellCos * sinOffset;
    // The mother only breathes inward so it never outgrows its frame.
    const breath = 1 + mix * 0.06 * Math.sin(time * 1.1 + cohort * 0.85) - small * (1 - mix) * 0.035 * (0.5 - 0.5 * Math.cos(time * 0.8));
    const r = this.radial[i] * radius * breath;
    const o = tilt * 4;
    const bcx = this.homeTilt[o];
    const bsx = this.homeTilt[o + 1];
    const bcy = this.homeTilt[o + 2];
    const bsy = this.homeTilt[o + 3];
    const dx = this.dir[i3] * cos + this.dir[i3 + 2] * sin;
    const dz = -this.dir[i3] * sin + this.dir[i3 + 2] * cos;
    let tx = dx * bcy + dz * bsy;
    const tz = -dx * bsy + dz * bcy;
    let localY = this.dir[i3 + 1] * bcx - tz * bsx;
    let localZ = this.dir[i3 + 1] * bsx + tz * bcx;
    const lively = Math.max(small, mix);
    const seed = this.seed[i];
    let twinkle = 0;
    if (lively > 0) {
      // Each particle wanders over its own shell on unrelated periods, so nothing loops visibly.
      const wander = lively * (0.06 + 0.09 * mix);
      tx += wander * Math.sin(time * (0.5 + seed * 0.7) + seed * 40);
      localY += wander * Math.cos(time * (0.45 + seed * 0.6) + seed * 23);
      localZ += wander * Math.sin(time * (0.55 + seed * 0.5) + seed * 61);
      const n = 1 / Math.hypot(tx, localY, localZ);
      tx *= n;
      localY *= n;
      localZ *= n;
      twinkle = lively * (0.5 + 0.5 * Math.sin(time * (0.6 + seed * 0.8) + seed * 17));
    }
    body[out] = (x - width / 2) * unit + tx * r;
    body[out + 1] = (height / 2 - y) * unit + localY * r;
    body[out + 2] = localZ * r;
    const cohortCount = this.active * (1 - 0.98 * mix);
    const density = Math.min(1, radiusPx * radiusPx * 0.9 / cohortCount);
    const edge = Math.min(0.08, Math.max(0.002, density * 0.2));
    const alpha = Math.max(0, Math.min(1, (density - seed) / edge));
    body[out + 3] = alpha * (1 - 0.3 * twinkle);
    const size = Math.max(0.5, Math.min(1, radiusPx / 160));
    body[out + 4] = (size + (0.7 - size) * mix) * (1 + 0.25 * (twinkle - 0.5 * lively));
    const color = this.accentMask[i] ? TONES.idle.accent : TONES.idle.base;
    const warm = this.accentMask[i] ? ON_DARK.accent : ON_DARK.base;
    for (let j = 0; j < 3; j++) body[out + 5 + j] = color[j] + (warm[j] - color[j]) * warmth;
  }

  /**
   * Advance the simulation. `tilt` is a small pointer-driven rotation applied
   * to every cluster's interior; `still` snaps to targets (reduced motion).
   */
  step(dt: number, tiltX: number, tiltY: number, still: boolean) {
    this.time += dt;
    const t = this.time;
    const kCenter = still ? 1 : ease(2.6, dt);
    const kRadius = still ? 1 : ease(2.8, dt);
    const kColor = still ? 1 : ease(3.2, dt);
    const kFlat = still ? 1 : ease(4, dt);

    for (let s = 0; s < this.clusters.length; s++) {
      const c = this.clusters[s];
      if (!c) continue;
      if (!c.inLayout && c.count === 0 && t > c.releaseAt) {
        this.keyToSlot.delete(c.key);
        this.clusters[s] = null;
        continue;
      }
      for (let a = 0; a < 3; a++) c.center[a] += (c.targetCenter[a] - c.center[a]) * kCenter;
      c.radius += (c.targetRadius - c.radius) * kRadius;
      for (let a = 0; a < 3; a++) {
        c.base[a] += (c.style.base[a] - c.base[a]) * kColor;
        c.accent[a] += (c.style.accent[a] - c.accent[a]) * kColor;
      }
      c.activity += (c.style.activity - c.activity) * kColor;
      c.alpha += (c.style.alpha - c.alpha) * kColor;
      c.size += (c.style.size - c.size) * kColor;
      c.flatten.amount += (c.targetFlatten - c.flatten.amount) * kFlat;
      c.flash = still ? 0 : c.flash * Math.exp(-dt * 2.4);
      const spin = still ? 0 : dt * (0.45 + c.activity);
      for (let sh = 0; sh < 3; sh++) {
        c.angles[sh] += SHELLS[sh].speed * spin;
        c.cos[sh] = Math.cos(c.angles[sh]);
        c.sin[sh] = Math.sin(c.angles[sh]);
      }
      c.breath = still ? 1 : 1 + (0.014 + c.activity * 0.012) * Math.sin(t * 0.85 + c.phase);
      c.pulseNow = c.pulse ? 0.78 + 0.22 * Math.sin(t * 2.6) : 1;
    }

    const cx = Math.cos(tiltX);
    const sx = Math.sin(tiltX);
    const cy = Math.cos(tiltY);
    const sy = Math.sin(tiltY);
    const damping = 2 * Math.sqrt(STIFFNESS) * 0.82;
    const kParticleColor = still ? 1 : ease(4.5, dt);
    const pos = this.position;
    const vel = this.velocity;
    const dir = this.dir;

    for (let i = 0; i < this.active; i++) {
      const slot = t < this.switchAt[i] ? this.prevSlot[i] : this.slot[i];
      const c = slot >= 0 ? this.clusters[slot] : null;
      const i3 = i * 3;
      if (!c) continue;
      const sh = this.shell[i];
      const shellR = this.radial[i] * c.radius * c.breath;
      // Shell spin around the vertical axis, then the shared pointer tilt.
      let x = dir[i3] * c.cos[sh] + dir[i3 + 2] * c.sin[sh];
      let y = dir[i3 + 1];
      let z = -dir[i3] * c.sin[sh] + dir[i3 + 2] * c.cos[sh];
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      const y1 = y * cx - z1 * sx;
      z = y * sx + z1 * cx;
      x = x1 * shellR;
      y = y1 * shellR;
      z *= shellR;
      const f = c.flatten.amount;
      if (f > 0.001) {
        const along = x * c.flatten.nx + y * c.flatten.ny;
        x -= c.flatten.nx * along * f;
        y -= c.flatten.ny * along * f;
      }
      const tx = c.center[0] + x;
      const ty = c.center[1] + y;
      const tz = c.center[2] + z;
      if (still) {
        pos[i3] = tx;
        pos[i3 + 1] = ty;
        pos[i3 + 2] = tz;
        vel[i3] = vel[i3 + 1] = vel[i3 + 2] = 0;
      } else {
        const k = STIFFNESS * (0.55 + this.seed[i] * 0.9);
        vel[i3] += ((tx - pos[i3]) * k - vel[i3] * damping) * dt;
        vel[i3 + 1] += ((ty - pos[i3 + 1]) * k - vel[i3 + 1] * damping) * dt;
        vel[i3 + 2] += ((tz - pos[i3 + 2]) * k - vel[i3 + 2] * damping) * dt;
        pos[i3] += vel[i3] * dt;
        pos[i3 + 1] += vel[i3 + 1] * dt;
        pos[i3 + 2] += vel[i3 + 2] * dt;
      }

      const src = this.accentMask[i] ? c.accent : c.base;
      const cs = this.colorState;
      cs[i3] += (src[0] - cs[i3]) * kParticleColor;
      cs[i3 + 1] += (src[1] - cs[i3 + 1]) * kParticleColor;
      cs[i3 + 2] += (src[2] - cs[i3 + 2]) * kParticleColor;
      // Illumination warms toward a soft highlight rather than blowing out to white.
      const fl = c.flash * 0.75;
      this.color[i3] = cs[i3] + (0.79 - cs[i3]) * fl;
      this.color[i3 + 1] = cs[i3 + 1] + (0.62 - cs[i3 + 1]) * fl;
      this.color[i3 + 2] = cs[i3 + 2] + (0.32 - cs[i3 + 2]) * fl;
      const i4 = i * 4;
      this.params[i4] = c.alpha * c.pulseNow * (1 + c.flash * 0.2);
      this.params[i4 + 1] = c.size * (1 + c.flash * 0.55);
      this.params[i4 + 2] = still ? 0 : c.activity;
      this.params[i4 + 3] = this.seed[i];
    }
  }
}
