/**
 * The small globes in the product panels: a sphere of points whose motion
 * names what an agent is doing. Pure geometry; `MiniOrb` draws it.
 */

/** What an agent row or the composer's globe shows. */
export type OrbState = "idle" | "working" | "searching" | "solving" | "returning" | "awaiting" | "done";

export type OrbPoint = { lat: number; lon: number; red: boolean };
export type Projected = { x: number; y: number; depth: number; red: boolean };

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Evenly spread points on a unit sphere; about one in seven is red. */
export function spherePoints(count: number): OrbPoint[] {
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - ((i + 0.5) / count) * 2;
    return { lat: Math.asin(y), lon: (i * GOLDEN) % (Math.PI * 2), red: (i * 7) % 47 < 7 };
  });
}

type Motion = (point: OrbPoint, index: number, t: number) => { lat: number; lon: number; r: number };

const RINGS = 7;
const snap = (lat: number) => {
  const band = Math.round(((lat / Math.PI) + 0.5) * (RINGS - 1));
  return (band / (RINGS - 1) - 0.5) * Math.PI * 0.86;
};

/** One motion per state. Time is in seconds. */
const MOTIONS: Record<OrbState, Motion> = {
  idle: (p, _i, t) => ({ lat: p.lat, lon: p.lon + t * 0.25, r: 1 }),
  done: (p, _i, t) => ({ lat: p.lat, lon: p.lon + t * 0.12, r: 0.94 }),
  // Points gather into latitude rings that turn at alternating speeds.
  working: (p, i, t) => {
    const lat = snap(p.lat);
    return { lat, lon: p.lon + t * (0.9 + (Math.round(lat * 4) % 2) * 0.5), r: 1 + Math.sin(t * 3 + i) * 0.015 };
  },
  // A meridian band sweeps the surface; points near it lift out.
  searching: (p, _i, t) => {
    const lon = p.lon + t * 0.35;
    const sweep = Math.cos(lon - t * 2.2);
    return { lat: p.lat, lon, r: 1 + Math.max(0, sweep - 0.82) * 0.5 };
  },
  // Points churn in place, each on its own short orbit.
  solving: (p, i, t) => ({
    lat: p.lat + Math.sin(t * 2.6 + i * 1.7) * 0.16,
    lon: p.lon + t * 0.5 + Math.cos(t * 2.1 + i * 0.9) * 0.22,
    r: 0.97 + Math.sin(t * 4 + i) * 0.03,
  }),
  // The sphere draws in toward its left side, where the parent sits.
  returning: (p, i, t) => {
    const pull = (Math.sin(t * 2.4 - i * 0.05) + 1) / 2;
    return { lat: p.lat * (1 - pull * 0.35), lon: p.lon + t * 0.6, r: 1 - pull * 0.12 };
  },
  // Held for a person: the sphere slows and breathes.
  awaiting: (p, _i, t) => ({ lat: p.lat, lon: p.lon + t * 0.08, r: 0.96 + Math.sin(t * 2) * 0.04 }),
};

const ease = (k: number) => (k >= 1 ? 1 : 1 - Math.pow(1 - k, 3));

/** The largest radius any motion reaches; projection divides by it so every point stays inside the unit disc. */
const REACH = 1.1;

/**
 * Project every point at time `t`, blending from `from` to `to` by `k` (0–1),
 * so a change of state morphs instead of cutting. A slight tilt shows the poles.
 */
export function projectOrb(points: OrbPoint[], from: OrbState, to: OrbState, k: number, t: number): Projected[] {
  const mix = ease(Math.max(0, Math.min(1, k)));
  const tilt = 0.32;
  const [st, ct] = [Math.sin(tilt), Math.cos(tilt)];
  return points.map((point, i) => {
    const a = MOTIONS[from](point, i, t);
    const b = mix === 0 || from === to ? a : MOTIONS[to](point, i, t);
    const lat = a.lat + (b.lat - a.lat) * mix;
    // States turn at different speeds; blend along the shorter arc so a morph never spins the sphere.
    const turn = b.lon - a.lon;
    const lon = a.lon + (turn - Math.round(turn / (Math.PI * 2)) * Math.PI * 2) * mix;
    const r = (a.r + (b.r - a.r) * mix) / REACH;
    const x = Math.cos(lat) * Math.sin(lon) * r;
    const y0 = Math.sin(lat) * r;
    const z0 = Math.cos(lat) * Math.cos(lon) * r;
    return { x, y: y0 * ct - z0 * st, depth: y0 * st + z0 * ct, red: point.red };
  });
}
