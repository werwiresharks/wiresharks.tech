import type { ClusterTarget, Vec3 } from "./layout.ts";
import { ACCENT_RATIO, TONES } from "./palette.ts";
import type { ToneStyle } from "./palette.ts";

/**
 * Particle simulation, independent of WebGL. Each particle belongs to one
 * cluster, keeps a fixed lattice position inside whichever cluster owns it,
 * and springs toward that position. Reassignments are staggered so particles
 * stream between clusters rather than teleporting.
 */

const SHELLS = [
  { fraction: 0.66, radius: 1, speed: 0.11 },
  { fraction: 0.23, radius: 0.64, speed: -0.08 },
  { fraction: 0.11, radius: 0.33, speed: 0.15 },
];
const MAX_SLOTS = 96;
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
  private seed: Float32Array;
  private accentMask: Uint8Array;
  private colorState: Float32Array;
  private slot: Int16Array;
  private prevSlot: Int16Array;
  private switchAt: Float32Array;
  private clusters: (Cluster | null)[] = [];
  private keyToSlot = new Map<string, number>();
  private time = 0;

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
      // A slight radial jitter keeps shells from reading as wireframes.
      const jitter = 1 + (random() - 0.5) * 0.05;
      this.dir[i * 3] = Math.cos(theta) * r * jitter;
      this.dir[i * 3 + 1] = y * jitter;
      this.dir[i * 3 + 2] = Math.sin(theta) * r * jitter;
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
    const next = Math.max(256, Math.min(this.capacity, Math.round(count)));
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
      .map((c, s) => s)
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
      const shellR = SHELLS[sh].radius * c.radius * c.breath;
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
      // Illumination warms toward bronze rather than blowing out to white.
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
