import type { Activity } from "./events.ts";

/**
 * The activity vocabulary as target functions over stable particle identity.
 *
 * Each pose maps one particle (its lattice direction after shell spin, radial
 * depth, shell and seed) to a point in the body's unit space, plus an energy
 * that lights it. A body blends poses by weight, so a change of activity is a
 * continuous morph of the same particles, never a swap of shapes. The outer
 * shell stays on the sphere in every pose but shaping, so the globe persists.
 *
 * Motion ideas adapted from thinking-orbs by Jakub Antalik (MIT, 2026):
 * orbits, latitude scan, stepped segment turns, a ribbon band and a shape morph.
 * Its notice is in THINKING-ORBS-LICENSE beside this file.
 */

export const POSE_COUNT = 7;
/** Lifecycle hold (awaiting authority). Not an activity: no agent chooses it. */
export const WAITING = 6;

export const POSE_OF: Record<Activity, number> = {
  listening: 0,
  working: 1,
  searching: 2,
  solving: 3,
  composing: 4,
  shaping: 5,
};

/** Spin of the shells relative to an idle globe, per pose. */
export const POSE_SPIN = [1, 2.4, 0.8, 0.12, 0.3, 0.6, 0];
/** How freely small globes let particles wander, per pose. Structure needs stillness. */
export const POSE_WANDER = [1, 0.6, 0.12, 0.08, 0.15, 0.2, 0];
/** Seconds a morph between poses takes. */
export const MORPH_SECONDS = 1.35;
/** A pose clock that shows each structure clearly, for still (reduced-motion) frames. */
export const STILL_TIME = 1;

const TAU = Math.PI * 2;
const fract = (n: number) => n - Math.floor(n);
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
/** Quintic smoothstep: zero first and second derivatives at both ends. */
export const ease = (n: number) => {
  const t = clamp01(n);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

type Basis = { n: number[]; u: number[]; v: number[] };

function basis(nx: number, ny: number, nz: number): Basis {
  const l = Math.hypot(nx, ny, nz);
  const n = [nx / l, ny / l, nz / l];
  const ref = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let u = [n[1] * ref[2] - n[2] * ref[1], n[2] * ref[0] - n[0] * ref[2], n[0] * ref[1] - n[1] * ref[0]];
  const ul = Math.hypot(u[0], u[1], u[2]);
  u = u.map((c) => c / ul);
  const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  return { n, u, v };
}

// Working: three tilted orbital planes inside the shell.
const ORBITS = [0, 1, 2].map((k) => {
  const tilt = (62 * Math.PI) / 180;
  const turn = ((k * 120 + 20) * Math.PI) / 180;
  return basis(Math.sin(tilt) * Math.cos(turn), Math.cos(tilt), Math.sin(tilt) * Math.sin(turn));
});
const ORBIT_SPEED = [1.5, -1.15, 1.85];

// Searching: latitude rings with a scan meridian.
const LINES = 9;
const SCAN_SPEED = 1.6;
const SCAN_PHASE = -2.1;

// Solving: three slabs that turn a quarter at a time and turn back.
const SLAB_GAP = 0.15;
const MOVE_SECONDS = 1.15;
const MOVE_SHARE = 0.62;
const MOVE_ORDER = [1, 0, 2, 1, 2, 0];
const TURNS = [0, 1, 0, -1];

// Composing: a tilted great-circle ribbon whose waves travel along it.
const RIBBON = basis(0.62, 0.78, 0.1);

// Shaping: a superellipsoid breathing between sphere and rounded cube, tilted to show a corner.
const SHAPE_TILT_X = 0.52;
const SHAPE_TILT_Z = 0.38;

// Waiting: a still globe with a held ring around it.
const RING_TILT = 0.32;

/** Completed moves of slab `j` before move `m`, given MOVE_ORDER's cycle. */
function movesBefore(j: number, m: number) {
  const cycles = Math.floor(m / MOVE_ORDER.length);
  let count = cycles * 2;
  const rest = m - cycles * MOVE_ORDER.length;
  for (let k = 0; k < rest; k++) if (MOVE_ORDER[k] === j) count++;
  return count;
}

/** Angle of slab `j` at pose time `t`, within a quarter turn of rest so blends never cross the sphere. */
export function slabAngle(j: number, t: number) {
  const m = Math.floor(t / MOVE_SECONDS);
  const k = movesBefore(j, m);
  const from = TURNS[((k % 4) + 4) % 4];
  if (MOVE_ORDER[((m % 6) + 6) % 6] !== j) return (from * Math.PI) / 2;
  const to = TURNS[(((k + 1) % 4) + 4) % 4];
  const u = ease(fract(t / MOVE_SECONDS) / MOVE_SHARE);
  return ((from + (to - from) * u) * Math.PI) / 2;
}

/**
 * Writes one pose for one particle to `out[o..o+4]`: x, y, z in the body's unit
 * space (outer shell at radius ~1), energy 0–1 and an alpha multiplier.
 * `dx, dy, dz` is the particle's unit lattice direction after shell spin.
 */
export function writePose(
  pose: number,
  dx: number,
  dy: number,
  dz: number,
  radial: number,
  shell: number,
  seed: number,
  t: number,
  out: Float32Array,
  o: number,
) {
  let x = dx * radial;
  let y = dy * radial;
  let z = dz * radial;
  let energy = 0;
  let alpha = 1;
  switch (pose) {
    case 0: {
      const ripple = 1 + 0.008 * Math.sin(t * 1.1 - dy * 3);
      x *= ripple;
      y *= ripple;
      z *= ripple;
      break;
    }
    case 1: {
      if (shell === 0) {
        alpha = 0.78;
        break;
      }
      const plane = Math.floor(fract(seed * 7.31) * 3);
      const { n, u, v } = ORBITS[plane];
      const start = TAU * fract(seed * 13.7);
      const a = start + t * ORBIT_SPEED[plane];
      const r = (shell === 1 ? 0.64 : 0.4) + (fract(seed * 31.3) - 0.5) * 0.08 + plane * 0.05;
      const lift = (fract(seed * 17.9) - 0.5) * 0.05;
      const c = Math.cos(a) * r;
      const s = Math.sin(a) * r;
      x = c * u[0] + s * v[0] + lift * n[0];
      y = c * u[1] + s * v[1] + lift * n[1];
      z = c * u[2] + s * v[2] + lift * n[2];
      // Each orbit carries a bright run of particles, so the circulation reads.
      energy = 0.3 + 0.7 * Math.pow(Math.max(0, Math.cos(start)), 10);
      break;
    }
    case 2: {
      let line = Math.round((dy * 0.5 + 0.5) * (LINES - 1)) / (LINES - 1);
      line = Math.max(-0.94, Math.min(0.94, line * 2 - 1));
      const k = Math.sqrt(1 - line * line) / Math.max(1e-4, Math.hypot(dx, dz));
      const r = shell === 0 ? radial : radial * 0.9;
      x = dx * k * r;
      y = line * r;
      z = dz * k * r;
      if (shell === 0) {
        const scan = Math.cos(Math.atan2(dx, dz) - (t * SCAN_SPEED + SCAN_PHASE));
        energy = Math.pow(Math.max(0, scan), 9);
      } else alpha = 0.7;
      break;
    }
    case 3: {
      const j = dy < -1 / 3 ? 0 : dy < 1 / 3 ? 1 : 2;
      const lo = -1 + (j * 2) / 3;
      const span = 2 / 3;
      const ny = lo + SLAB_GAP + ((dy - lo) * (span - 2 * SLAB_GAP)) / span;
      const k = Math.sqrt(1 - ny * ny) / Math.max(1e-4, Math.hypot(dx, dz));
      const angle = slabAngle(j, t);
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const px = dx * k;
      const pz = dz * k;
      x = (px * c + pz * s) * radial;
      y = ny * radial;
      z = (-px * s + pz * c) * radial;
      if (shell === 0) {
        // A marker on each slab's face: aligned at rest, the stripe breaks when one slab turns.
        energy = Math.pow(Math.max(0, Math.cos(Math.atan2(dx, dz))), 8);
      } else alpha = 0.6;
      break;
    }
    case 4: {
      const { n, u, v } = RIBBON;
      const along = dx * n[0] + dy * n[1] + dz * n[2];
      const member = shell !== 0 || (fract(seed * 5.31) < 0.46 && Math.abs(along) < 0.82);
      if (!member) {
        alpha = 0.72;
        break;
      }
      const a =
        shell === 0
          ? Math.atan2(dx * v[0] + dy * v[1] + dz * v[2], dx * u[0] + dy * u[1] + dz * u[2])
          : TAU * fract(seed * 13.7);
      const lane = (fract(seed * 31.7) - 0.5) * 0.34;
      const wave = 0.09 * Math.sin(3 * a - t * 2.4) + 0.04 * Math.sin(5 * a + t * 1.3);
      const r = shell === 0 ? 1 : 0.62 + lane * 0.3;
      const off = shell === 0 ? lane + wave : lane * 0.6 + wave;
      x = Math.cos(a) * r * u[0] + Math.sin(a) * r * v[0] + off * n[0];
      y = Math.cos(a) * r * u[1] + Math.sin(a) * r * v[1] + off * n[1];
      z = Math.cos(a) * r * u[2] + Math.sin(a) * r * v[2] + off * n[2];
      if (shell === 0) {
        const l = radial / Math.hypot(x, y, z);
        x *= l;
        y *= l;
        z *= l;
      }
      energy = 0.4 + 0.6 * Math.pow(0.5 + 0.5 * Math.sin(2 * a - t * 2.4), 6);
      break;
    }
    case 5: {
      const q = 2.4 + 1.8 * (0.5 - 0.5 * Math.cos(t * 0.9));
      // Into the tilted cube frame (about x, then z), shape, and back.
      const cx = Math.cos(SHAPE_TILT_X);
      const sx = Math.sin(SHAPE_TILT_X);
      const cz = Math.cos(SHAPE_TILT_Z);
      const sz = Math.sin(SHAPE_TILT_Z);
      const ay = dy * cx - dz * sx;
      const az = dy * sx + dz * cx;
      const bx = dx * cz - ay * sz;
      const by = dx * sz + ay * cz;
      const norm = Math.pow(Math.abs(bx) ** q + Math.abs(by) ** q + Math.abs(az) ** q, 1 / q);
      const scale = (0.86 * radial) / norm;
      const px = bx * scale;
      const py = by * scale;
      const pz = az * scale;
      const ry = -px * sz + py * cz;
      x = px * cz + py * sz;
      y = ry * cx + pz * sx;
      z = -ry * sx + pz * cx;
      if (shell === 0) energy = clamp01((0.86 / norm - 0.95) / 0.3) * 0.9;
      break;
    }
    case 6: {
      if (shell === 0 && Math.abs(dy) < 0.12) {
        // The held ring: an equatorial band lifted off the globe, tilted toward the viewer.
        const l = (1.2 + dy * 0.25) * radial / Math.max(1e-4, Math.hypot(dx, dz));
        const rx = dx * l;
        const rz = dz * l;
        x = rx;
        y = -rz * Math.sin(RING_TILT);
        z = rz * Math.cos(RING_TILT);
        energy = 0.7;
        break;
      }
      const shrink = shell === 0 ? 0.97 : 0.9;
      x *= shrink;
      y *= shrink;
      z *= shrink;
      alpha = 0.85;
      break;
    }
  }
  out[o] = x;
  out[o + 1] = y;
  out[o + 2] = z;
  out[o + 3] = energy;
  out[o + 4] = alpha;
}
