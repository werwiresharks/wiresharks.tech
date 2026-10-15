import type { Tone } from "./layout.ts";

/**
 * Visual vocabulary for each state. Colours are display (sRGB) values tuned
 * for a white page: graphite structure, cool-blue proposals, bronze execution
 * and authority. `activity` drives internal motion; `alpha` and `size` scale
 * the particles themselves.
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
  cool: hex(0x3b74b0),
  coolDeep: hex(0x2b5884),
  bronze: hex(0xc9a86a),
  bronzeDeep: hex(0x9c7a3c),
  bone: hex(0xb9bdc0),
  failed: hex(0x8a4c46),
  red: hex(0xd52b24),
};

export const TONES: Record<Tone, ToneStyle> = {
  idle: { base: COLORS.graphite, accent: COLORS.cool, activity: 0.32, alpha: 0.78, size: 1 },
  proposing: { base: COLORS.coolDeep, accent: COLORS.cool, activity: 0.75, alpha: 0.82, size: 1 },
  running: { base: COLORS.graphite, accent: COLORS.bronzeDeep, activity: 0.85, alpha: 0.82, size: 1 },
  awaiting: { base: COLORS.slate, accent: COLORS.bronze, activity: 0.12, alpha: 0.7, size: 0.95 },
  completed: { base: COLORS.graphite, accent: COLORS.bronze, activity: 0.25, alpha: 0.8, size: 1 },
  failed: { base: COLORS.failed, accent: COLORS.slate, activity: 0.06, alpha: 0.5, size: 0.85 },
  trace: { base: COLORS.bone, accent: COLORS.bronze, activity: 0.05, alpha: 0.55, size: 0.8 },
  "action-proposed": { base: COLORS.cool, accent: COLORS.coolDeep, activity: 0.7, alpha: 0.9, size: 1.05 },
  "action-awaiting": { base: COLORS.bronzeDeep, accent: COLORS.bronze, activity: 0.08, alpha: 0.95, size: 1.1 },
  "action-approved": { base: COLORS.bronze, accent: COLORS.bronzeDeep, activity: 0.6, alpha: 0.95, size: 1.15 },
  "action-executing": { base: COLORS.bronzeDeep, accent: COLORS.bronze, activity: 0.9, alpha: 0.9, size: 1.05 },
  rollback: { base: COLORS.slate, accent: COLORS.cool, activity: 0.15, alpha: 0.7, size: 0.95 },
};

/** Portion of particles in every cluster that carry the accent colour. */
export const ACCENT_RATIO = 0.16;
