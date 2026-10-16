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
 * One orb dissolving into a stream and reforming as another. `progress` runs 0 (all particles in
 * `from`) to 1 (all in `to`); `weight` blends the flow in over the ordinary single-orb pose.
 */
export type HomeFlow = {
  progress: number;
  weight: number;
  from: Framing;
  to: Framing;
  /** The channel every path bends through, in viewport pixels. */
  via: { x: number; y: number };
  warmFrom: number;
  warmTo: number;
};

/**
 * Document frames for the flow's two orbs. A `pinned` source holds its viewport position once
 * scrolling passes `start`; otherwise it rides the page. `via` (document) routes the stream around
 * copy; by default it bows away from the left-hand column.
 */
export type JourneyFlow = {
  start: number;
  end: number;
  from: Framing;
  to: Framing;
  pinned: boolean;
  via?: { x: number; y: number };
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
];

export function createHomeFrame(): HomeFrame {
  return {
    mother: { x: 0, y: 0, radius: 0 },
    docked: false,
    scroll: 0,
    satellites: HOME_KEYS.map((key) => ({ key, frame: { x: 0, y: 0, radius: 0 }, mix: 0 })),
    opacity: 1,
    warm: 0,
    flow: { progress: 0, weight: 0, from: { x: 0, y: 0, radius: 0 }, to: { x: 0, y: 0, radius: 0 }, via: { x: 0, y: 0 }, warmFrom: 0, warmTo: 0 },
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
    // The flow's ends are exact document frames; its progress eases like the mother so wheel jumps glide.
    const flow = this.frame.flow;
    const next = target.flow;
    Object.assign(flow.from, next.from);
    Object.assign(flow.to, next.to);
    Object.assign(flow.via, next.via);
    flow.warmFrom = next.warmFrom;
    flow.warmTo = next.warmTo;
    flow.progress = immediate || Math.abs(next.progress - flow.progress) < 0.0005 ? next.progress : flow.progress + (next.progress - flow.progress) * blend;
    // Stay in flight until the eased progress lands, then hand back to the single orb.
    const flying = next.weight > 0 || (flow.progress > 0.0005 && flow.progress < 0.9995) ? 1 : 0;
    flow.weight = immediate || Math.abs(flying - flow.weight) < 0.0005 ? flying : flow.weight + (flying - flow.weight) * blend;
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
  if (flow) {
    const f = out.flow;
    f.from.x = flow.from.x;
    f.from.y = flow.from.y - (flow.pinned ? flow.start : scroll);
    f.from.radius = flow.from.radius;
    f.to.x = flow.to.x;
    f.to.y = flow.to.y - scroll;
    f.to.radius = flow.to.radius;
    if (flow.via) {
      f.via.x = flow.via.x;
      f.via.y = flow.via.y - scroll;
    } else {
      const dx = f.to.x - f.from.x;
      const dy = f.to.y - f.from.y;
      // Perpendicular, pointing right (screen y runs down).
      const flip = dy >= 0 ? 1 : -1;
      f.via.x = (f.from.x + f.to.x) / 2 + Math.abs(dy) * 0.16;
      f.via.y = (f.from.y + f.to.y) / 2 - dx * 0.16 * flip;
    }
    f.warmFrom = flow.warmFrom ?? 0;
    f.warmTo = flow.warmTo ?? 0;
    f.progress = clamp((scroll - flow.start) / Math.max(1, flow.end - flow.start));
    f.weight = scroll > flow.start && scroll < flow.end ? 1 : 0;
    if (f.weight) {
      // The single-orb pose the flow stands in for: continuous with the stops at both ends.
      const k = smooth(f.progress);
      out.mother.x = f.from.x + (f.to.x - f.from.x) * k;
      out.mother.y = f.from.y + (f.to.y - f.from.y) * k;
      out.mother.radius = f.from.radius + (f.to.radius - f.from.radius) * k;
      out.warm = f.warmFrom + (f.warmTo - f.warmFrom) * k;
    }
  } else {
    out.flow.weight = 0;
  }
  return out;
}
