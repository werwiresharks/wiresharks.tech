import type { Tone } from "./layout.ts";

/**
 * Visual vocabulary for each state. Colours are display (sRGB) values tuned
 * for a white page: graphite structure with the brand red as the single accent;
 * state reads through intensity, not hue. `activity` drives internal motion;
 * `alpha` and `size` scale the particles themselves.
 */

export type ToneStyle = {
  base: [number, number, number];
  accent: [number, number, number];
  activity: number;
  alpha: number;
  size: number;
};

const hex = (value: number): [number, number, number] => [
  ((value >> 16) & 255) / 255,
  ((value >> 8) & 255) / 255,
  (value & 255) / 255,
];

export const COLORS = {
  ink: hex(0x181a1b),
  graphite: hex(0x2f3438),
  slate: hex(0x5b646b),
  bone: hex(0xb9bdc0),
  failed: hex(0x8a4c46),
  red: hex(0xe5251b), // the single brand accent, matched to --red
  redDeep: hex(0xc01812),
  redGlow: hex(0xff6a60),
};

/**
 * Structure stays graphite; the accent is always the brand red. Intensity now
 * carries state instead of hue: live states glow brighter and larger, held and
 * trace states stay dim. One signal colour across the whole site.
 */
export const TONES: Record<Tone, ToneStyle> = {
  idle: { base: COLORS.graphite, accent: COLORS.red, activity: 0.32, alpha: 0.78, size: 1 },
  proposing: { base: COLORS.graphite, accent: COLORS.redGlow, activity: 0.75, alpha: 0.82, size: 1 },
  running: { base: COLORS.graphite, accent: COLORS.red, activity: 0.85, alpha: 0.82, size: 1 },
  awaiting: { base: COLORS.slate, accent: COLORS.redDeep, activity: 0.12, alpha: 0.7, size: 0.95 },
  completed: { base: COLORS.graphite, accent: COLORS.red, activity: 0.25, alpha: 0.8, size: 1 },
  failed: { base: COLORS.failed, accent: COLORS.slate, activity: 0.06, alpha: 0.5, size: 0.85 },
  trace: { base: COLORS.bone, accent: COLORS.redDeep, activity: 0.05, alpha: 0.55, size: 0.8 },
  "action-proposed": { base: COLORS.graphite, accent: COLORS.redGlow, activity: 0.7, alpha: 0.9, size: 1.05 },
  "action-awaiting": { base: COLORS.slate, accent: COLORS.redDeep, activity: 0.08, alpha: 0.95, size: 1.1 },
  "action-approved": { base: COLORS.graphite, accent: COLORS.red, activity: 0.6, alpha: 0.95, size: 1.15 },
  "action-executing": { base: COLORS.graphite, accent: COLORS.redGlow, activity: 0.9, alpha: 0.9, size: 1.05 },
  rollback: { base: COLORS.slate, accent: COLORS.redDeep, activity: 0.15, alpha: 0.7, size: 0.95 },
};

/** Orbs over dark (tone-dark) sections: light grey with the red accent. */
export const ON_DARK = { base: hex(0xd4d4d2), accent: COLORS.red };

/** The gutter stream crosses light and dark sections, so it takes a mid grey that reads on both. */
export const STREAM = { base: hex(0x8a8f93), accent: COLORS.red };

/** Portion of particles in every cluster that carry the accent colour. */
export const ACCENT_RATIO = 0.16;

/** The ground an engine view draws on. The site is light; product surfaces may be dark. */
export type Surface = "light" | "dark";

/**
 * Per-surface colours for the agent view. Light is the site's graphite; dark
 * swaps structure to the kit's on-dark greys and lifts the deep red to the
 * accent so the boundary keeps its contrast. The red ratio is unchanged.
 */
const DARK = {
  graphite: ON_DARK.base,
  slate: hex(0x9b9b98),
  bone: hex(0x5e6264),
  failed: hex(0xb27a72),
};

const toDark = (rgb: [number, number, number]) =>
  rgb === COLORS.graphite
    ? DARK.graphite
    : rgb === COLORS.slate
      ? DARK.slate
      : rgb === COLORS.bone
        ? DARK.bone
        : rgb === COLORS.failed
          ? DARK.failed
          : rgb === COLORS.redDeep
            ? COLORS.red
            : rgb;

export type SurfaceStyle = {
  tones: Record<Tone, ToneStyle>;
  /** Colour the far hemisphere recedes toward. */
  fog: [number, number, number];
  thread: [number, number, number];
  boundary: [number, number, number];
  checkpoint: [number, number, number];
};

export const SURFACES: Record<Surface, SurfaceStyle> = {
  light: {
    tones: TONES,
    fog: [0.8, 0.83, 0.86],
    thread: COLORS.graphite,
    boundary: COLORS.redDeep,
    checkpoint: COLORS.slate,
  },
  dark: {
    tones: Object.fromEntries(
      Object.entries(TONES).map(([tone, style]) => [
        tone,
        { ...style, base: toDark(style.base), accent: toDark(style.accent) },
      ]),
    ) as Record<Tone, ToneStyle>,
    fog: [0.07, 0.075, 0.08],
    thread: DARK.slate,
    boundary: COLORS.red,
    checkpoint: DARK.slate,
  },
};
