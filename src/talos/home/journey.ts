import type { Framing } from "../engine/renderer.ts";

export type HomeFrame = {
  mother: Framing;
  docked: boolean;
  scroll: number;
  satellites: { key: string; frame: Framing; mix: number }[];
  opacity: number;
  /** 0–1: how far particles take the bronze tone used over dark sections. */
  warm: number;
  flow: HomeFlow;
};

/**
 * The page-long stream: the hero orb dissolves into a river of particles that flows down the right
 * gutter through every section, then gathers into the release orb at the end. `dissolve` and `gather`
 * run 0–1 over their scroll ranges; `phase` is the scroll position the river flows with; `weight`
 * blends the stream in over the ordinary single-orb pose.
 */
export type HomeFlow = {
  dissolve: number;
  gather: number;
  phase: number;
  weight: number;
  from: Framing;
  to: Framing;
  /** Centre line and half-width of the river, in viewport pixels. */
  river: { x: number; width: number };
  warmFrom: number;
  warmTo: number;
};

/**
 * Document frames for the stream's two orbs. A `pinned` source holds its viewport position while it
 * dissolves; otherwise it rides the page. Scroll ranges are [start, end] pairs.
 */
export type JourneyFlow = {
  from: Framing;
  to: Framing;
  pinned: boolean;
  dissolve: [number, number];
  gather: [number, number];
  river: { x: number; width: number };
  warmFrom?: number;
  warmTo?: number;
};

export type JourneyStop = { at: number; frame: Framing; opacity?: number; warm?: number };
export type JourneyDock = {
  enter: number;
  leave: number;
  holdFrom?: number;
  satelliteLeave?: number;
  satellites: { key: string; frame: Framing }[];
};
export type HomeGeometry = {
  stops: JourneyStop[];
  docks: JourneyDock[];
  end: number;
  height: number;
  mobile: boolean;
  width?: number;
  heroExit?: number;
  flow?: JourneyFlow;
};

export const HOME_KEYS = [
  "worker-0", "worker-1", "worker-2", "worker-3", "worker-4", "worker-5",
  "principle-0", "principle-1", "principle-2", "principle-3",
  // While the stream runs, the coordinator and console marks are fed from it like the workers.
  "coordinator", "console",
];

export function createHomeFrame(): HomeFrame {
  return {
    mother: { x: 0, y: 0, radius: 0 },
    docked: false,
    scroll: 0,
    satellites: HOME_KEYS.map((key) => ({ key, frame: { x: 0, y: 0, radius: 0 }, mix: 0 })),
    opacity: 1,
    warm: 0,
    flow: {
      dissolve: 0, gather: 0, phase: 0, weight: 0,
      from: { x: 0, y: 0, radius: 0 }, to: { x: 0, y: 0, radius: 0 }, river: { x: 0, width: 0 }, warmFrom: 0, warmTo: 0,
    },
  };
}

/** Travel eases in document space so a settled panel follows scrolling without lag. */
export class HomeMotion {
  private frame = createHomeFrame();
  private velocity = { x: 0, y: 0, radius: 0 };
  private initialized = false;

  step(target: HomeFrame, dt: number, snap = false): HomeFrame {
    const immediate = snap || !this.initialized;
    this.frame.mother.y += this.frame.scroll - target.scroll;
    this.frame.scroll = target.scroll;
    this.initialized = true;
    this.frame.docked = target.docked;
    const decay = Math.exp(-12 * dt);
    for (const axis of ["x", "y", "radius"] as const) {
      const offset = this.frame.mother[axis] - target.mother[axis];
      const change = this.velocity[axis] + 12 * offset;
      this.frame.mother[axis] = immediate ? target.mother[axis] : target.mother[axis] + (offset + change * dt) * decay;
      this.velocity[axis] = immediate ? 0 : (this.velocity[axis] - 12 * change * dt) * decay;
      if (Math.abs(this.frame.mother[axis] - target.mother[axis]) < 0.01 && Math.abs(this.velocity[axis]) < 0.1) {
        this.frame.mother[axis] = target.mother[axis];
        this.velocity[axis] = 0;
      }
    }
    const blend = immediate ? 1 : 1 - Math.exp(-10 * dt);
    this.frame.opacity += (target.opacity - this.frame.opacity) * blend;
    this.frame.warm += (target.warm - this.frame.warm) * blend;
    // The stream's ends are exact frames; its progress and phase ease like the mother, so wheel jumps glide.
    const flow = this.frame.flow;
    const next = target.flow;
    Object.assign(flow.from, next.from);
    Object.assign(flow.to, next.to);
    Object.assign(flow.river, next.river);
    flow.warmFrom = next.warmFrom;
    flow.warmTo = next.warmTo;
    const ease = (current: number, goal: number, epsilon: number) =>
      immediate || Math.abs(goal - current) < epsilon ? goal : current + (goal - current) * blend;
    flow.dissolve = ease(flow.dissolve, next.dissolve, 0.0005);
    flow.gather = ease(flow.gather, next.gather, 0.0005);
    flow.phase = ease(flow.phase, next.phase, 0.05);
    // Stay in the stream until the eased progress lands at either end, then hand back to the single orb.
    const landed = (flow.dissolve < 0.0005 && next.dissolve === 0) || (flow.gather > 0.9995 && next.gather === 1);
    const flowing = next.weight > 0 || !landed ? 1 : 0;
    flow.weight = ease(flow.weight, flowing, 0.0005);
    for (let i = 0; i < this.frame.satellites.length; i++) {
      const current = this.frame.satellites[i];
      const next = target.satellites[i];
      current.frame.x = next.frame.x;
      current.frame.y = next.frame.y;
      current.frame.radius = next.frame.radius;
      current.mix = next.mix;
    }
    return this.frame;
  }
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };

/**
 * `copyRight` and `copyTop` bound the hero copy: the desktop orb stays to its right and the tablet
 * orb, which sits above the stacked copy, ends before it.
 */
export function heroFrame(width: number, height: number, copyRight = width * 0.5, copyTop = Infinity): Framing {
  if (width >= 1024) {
    // Anchor to the right edge, clear of the copy, centred in the visible hero below the header.
    const margin = Math.max(24, width * 0.06);
    const gap = Math.max(24, width * 0.02);
    const radius = Math.min(width * 0.45, (height - 140 - 24) / 2, (width - margin - copyRight - gap) / 2);
    return { x: width - margin - radius, y: (140 + height - 24) / 2, radius };
  }
  if (width >= 768) {
    // Fill the visible hero between the fixed header and the copy (or the bottom edge).
    const radius = Math.min(width * 0.45, (height - 140 - 24) / 2, (copyTop - 140 - 24) / 2);
    return { x: width * 0.5, y: 140 + radius, radius };
  }
  const radius = Math.min(width * 0.23, 110);
  return { x: width / 2, y: height - radius - 36, radius };
}

/** Samples cached document coordinates into an existing viewport pose. */
export function sampleHomeFrame(geometry: HomeGeometry, scroll: number, out: HomeFrame): HomeFrame {
  const { stops, height } = geometry;
  out.scroll = scroll;
  if (!stops.length) { out.opacity = 0; return out; }
  let left = stops[0];
  let right = left;
  for (let i = 1; i < stops.length; i++) {
    right = stops[i];
    if (scroll <= right.at) break;
    left = right;
  }
  const t = smooth((scroll - left.at) / Math.max(1, right.at - left.at));
  const dx = right.frame.x - left.frame.x;
  const dy = right.frame.y - left.frame.y;
  out.mother.x = left.frame.x + dx * t;
  out.mother.y = left.frame.y + dy * t - scroll;
  out.mother.radius = left.frame.radius + (right.frame.radius - left.frame.radius) * t;
  const docked = geometry.docks.some((dock) => dock.holdFrom !== undefined && scroll >= dock.holdFrom && scroll <= dock.leave);
  out.docked = docked;
  if (geometry.width !== undefined && scroll > (geometry.heroExit ?? -1) && !docked) {
    const header = geometry.mobile ? 64 : 76;
    const edge = geometry.mobile ? 11 : geometry.width < 1024 ? 12 : 22;
    const margin = geometry.mobile ? 4 : geometry.width < 1024 ? 8 : 24;
    out.mother.radius = Math.max(1, Math.min(out.mother.radius, (geometry.width - 8) / 2, (height - header - 48) / 2));
    const top = header + out.mother.radius + 50;
    const bottom = height - out.mother.radius - 28;
    const overflow = Math.max(top - out.mother.y, out.mother.y - bottom, 0);
    const park = smooth(overflow / Math.max(60, out.mother.radius * 2));
    out.mother.radius += (edge - out.mother.radius) * park;
    const parkX = !geometry.mobile && out.mother.x < geometry.width / 2 ? edge + margin : geometry.width - edge - margin;
    out.mother.x += (parkX - out.mother.x) * park;
    out.mother.y = Math.max(header + out.mother.radius + 50, Math.min(height - out.mother.radius - 28, out.mother.y));
    out.mother.x = Math.max(out.mother.radius + 4, Math.min(geometry.width - out.mother.radius - 4, out.mother.x));
  }
  const opacity = (left.opacity ?? 1) + ((right.opacity ?? 1) - (left.opacity ?? 1)) * t;
  out.warm = (left.warm ?? 0) + ((right.warm ?? 0) - (left.warm ?? 0)) * t;
  out.opacity = opacity * (1 - smooth((scroll - (geometry.end - height * 0.6)) / (height * 0.45)));
  for (const satellite of out.satellites) {
    satellite.mix = 0;
    for (const dock of geometry.docks) {
      let index = 0;
      while (index < dock.satellites.length && dock.satellites[index].key !== satellite.key) index++;
      if (index === dock.satellites.length) continue;
      const target = dock.satellites[index].frame;
      const stagger = index * (geometry.mobile ? 9 : 14);
      const arrivalEnd = dock.holdFrom ?? dock.enter + height * 0.16 + (dock.satellites.length - 1) * (geometry.mobile ? 9 : 14);
      const arrive = smooth((scroll - dock.enter - stagger) / Math.max(1, arrivalEnd - dock.enter - stagger));
      const depart = 1 - smooth((scroll - (dock.satelliteLeave ?? dock.leave)) / (height * 0.18));
      satellite.mix = arrive * depart;
      satellite.frame.x = target.x;
      satellite.frame.y = target.y - scroll;
      satellite.frame.radius = target.radius;
      break;
    }
  }
  const flow = geometry.flow;
  const f = out.flow;
  if (flow) {
    f.from.x = flow.from.x;
    f.from.y = flow.from.y - (flow.pinned ? Math.min(scroll, flow.dissolve[0]) : scroll);
    f.from.radius = flow.from.radius;
    f.to.x = flow.to.x;
    f.to.y = flow.to.y - scroll;
    f.to.radius = flow.to.radius;
    f.river.x = flow.river.x;
    f.river.width = flow.river.width;
    f.warmFrom = flow.warmFrom ?? 0;
    f.warmTo = flow.warmTo ?? 1;
    f.phase = scroll;
    f.dissolve = clamp((scroll - flow.dissolve[0]) / Math.max(1, flow.dissolve[1] - flow.dissolve[0]));
    f.gather = clamp((scroll - flow.gather[0]) / Math.max(1, flow.gather[1] - flow.gather[0]));
    f.weight = scroll > flow.dissolve[0] && scroll < flow.gather[1] ? 1 : 0;
    if (f.weight) {
      // The single-orb pose the stream stands in for: the hero orb, the river, then the release orb.
      // Continuous with the stops at both ends.
      const river = { x: f.river.x, y: height / 2, radius: f.river.width };
      const [a, b, k] = f.gather > 0 ? [river, f.to, smooth(f.gather)] : [f.from, river, smooth(f.dissolve)];
      out.mother.x = a.x + (b.x - a.x) * k;
      out.mother.y = a.y + (b.y - a.y) * k;
      out.mother.radius = a.radius + (b.radius - a.radius) * k;
      out.warm = f.gather > 0 ? 1 : f.warmFrom + (1 - f.warmFrom) * k;
      out.opacity = 1;
      out.docked = false;
    }
  } else {
    f.weight = 0;
  }
  return out;
}
