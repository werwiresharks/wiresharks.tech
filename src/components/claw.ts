/**
 * Geometry for the hero's claw tear: three slashes cut through the surface as
 * scroll progress runs 0 → 1. Pure, so the shape can be tested without a DOM.
 */

import type { Cut } from "../talos/engine/shaders.ts";

export type Box = { x: number; y: number; w: number; h: number };

/** The marks as last drawn, in document pixels. One tear per page; the particle orb parts around them. */
export const clawFeed: { cuts: readonly Cut[] } = { cuts: [] };

/** One claw mark, in coordinates normalized to the tear zone. */
type Slash = {
  from: [number, number];
  to: [number, number];
  /** Sideways bow at the midpoint, as a fraction of the slash length. */
  bow: number;
  /** Share of the full opening width this mark reaches. */
  scale: number;
  /** Progress at which this mark's strike begins; the marks land in sequence. */
  delay: number;
};

export type ClawLayout = {
  slashes: Slash[];
  /** Full opening width of a mark, as a fraction of the zone width. */
  width: number;
  /** Edge points per side; fewer on phones. */
  samples: number;
};

export const CLAW_LAYOUTS = {
  /** Marks run off the hero's bottom edge, into the dark section below. */
  edge: {
    width: 0.165,
    samples: 52,
    slashes: [
      { from: [0.5, 0], to: [0.06, 1.1], bow: 0.03, scale: 0.88, delay: 0 },
      { from: [0.74, 0.03], to: [0.31, 1.14], bow: 0.035, scale: 1, delay: 0.05 },
      { from: [0.97, 0.11], to: [0.57, 1.12], bow: 0.03, scale: 0.84, delay: 0.1 },
    ],
  },
  /** Marks start and end inside a band of the hero, clear of the copy. */
  band: {
    width: 0.15,
    samples: 36,
    slashes: [
      { from: [0.36, 0], to: [0.12, 1], bow: 0.03, scale: 0.86, delay: 0 },
      { from: [0.6, -0.02], to: [0.36, 1.02], bow: 0.035, scale: 1, delay: 0.05 },
      { from: [0.84, 0.04], to: [0.6, 0.97], bow: 0.03, scale: 0.82, delay: 0.1 },
    ],
  },
} satisfies Record<string, ClawLayout>;

/** Share of progress spent striking (drawing the marks) before they open. */
const STRIKE = 0.18;
const HAIRLINE = 1.4;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
/** Deterministic noise in [-0.5, 0.5], so the torn edge holds still between frames. */
const noise = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s) - 0.5;
};
const f = (v: number) => Math.round(v * 10) / 10;

export type ClawShape = {
  /** Closed hole outlines, one subpath per mark. Empty before the strike. */
  holes: string;
  /** Outline of the trailing mark alone, edged in red like the Raptor mark's trailing claw. */
  trailing: string;
  /** Centre lines of the marks, drawn as the red strike cue. */
  strike: string;
  /** 0 while the marks are hairlines, 1 when fully open. */
  open: number;
  /** Every mark as a chord for the particle orb to part around, in zone pixels; one not yet struck has reach 0. */
  cuts: Cut[];
};

export function clawShape(layout: ClawLayout, zone: Box, progress: number): ClawShape {
  const p = clamp(progress);
  const open = easeInOut(clamp((p - STRIKE) / (1 - STRIKE)));
  let holes = "";
  let strike = "";
  let trailing = "";
  const cuts: Cut[] = [];
  layout.slashes.forEach((slash, i) => {
    const reach = easeOut(clamp((p - slash.delay) / (STRIKE - 0.04)));
    const ax = zone.x + slash.from[0] * zone.w;
    const ay = zone.y + slash.from[1] * zone.h;
    const bx = zone.x + slash.to[0] * zone.w;
    const by = zone.y + slash.to[1] * zone.h;
    const len = Math.hypot(bx - ax, by - ay);
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    const full = layout.width * zone.w * slash.scale;
    const width = HAIRLINE + (full - HAIRLINE) * open;
    cuts.push({ ax, ay, bx, by, bow: slash.bow * len, half: width / 2, reach });
    if (reach <= 0) return;
    const left: string[] = [];
    const right: string[] = [];
    const line: string[] = [];
    const n = layout.samples;
    for (let k = 0; k <= n; k++) {
      const t = (k / n) * reach;
      const bend = slash.bow * len * Math.sin(Math.PI * t);
      const cx = ax + (bx - ax) * t + nx * bend;
      const cy = ay + (by - ay) * t + ny * bend;
      // A claw enters sharp, bites widest past the middle, then tails off;
      // the tip stays pointed while the mark is still being drawn.
      const body = Math.sin(Math.PI * Math.min(1, t ** 0.8)) ** 0.6;
      const tip = Math.min(1, (reach - t) / 0.06);
      const half = (width * body * tip) / 2;
      const tear = half * 0.09 + 0.7 * open;
      const l = half + tear * noise(i, k) + tear * 0.5 * noise(i + 7, k * 5);
      const r = half + tear * noise(i + 3, k) + tear * 0.5 * noise(i + 11, k * 5);
      left.push(`${f(cx + nx * l)} ${f(cy + ny * l)}`);
      right.push(`${f(cx - nx * r)} ${f(cy - ny * r)}`);
      line.push(`${f(cx)} ${f(cy)}`);
    }
    const outline = `M${left.join("L")}L${right.reverse().join("L")}Z`;
    holes += outline;
    if (i === layout.slashes.length - 1) trailing = outline;
    strike += `M${line.join("L")}`;
  });
  return { holes, trailing, strike, open, cuts };
}
