import type { Framing } from "../engine/renderer.ts";

export type HomeFrame = {
  mother: Framing;
  docked: boolean;
  scroll: number;
  satellites: { key: string; frame: Framing; mix: number }[];
  opacity: number;
  /** 0–1: how far particles take the bronze tone used over dark sections. */
  warm: number;
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
  return out;
}
