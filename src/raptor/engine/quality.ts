/**
 * Adaptive quality: an initial hardware estimate, then a runtime governor
 * that steps particle count and pixel ratio down if frames run long.
 */

export type QualityTier = {
  name: "low" | "mobile" | "standard" | "high";
  particles: number;
  maxPixelRatio: number;
};

export function detectQuality(scale = 1): QualityTier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 8;
  let tier: QualityTier;
  if (coarse && (memory <= 3 || cores <= 4))
    tier = { name: "low", particles: 2600, maxPixelRatio: 1.5 };
  else if (coarse)
    tier = { name: "mobile", particles: 4800, maxPixelRatio: 1.75 };
  else if (cores >= 8 && memory >= 8)
    tier = { name: "high", particles: 13000, maxPixelRatio: 2 };
  else tier = { name: "standard", particles: 8500, maxPixelRatio: 1.75 };
  return { ...tier, particles: Math.round(tier.particles * scale) };
}

/** Exponential moving average of frame time with step-down decisions. */
export class FrameGovernor {
  private average = 16.7;
  private slowFrames = 0;
  private cooldown = 120;

  /** Returns true when the caller should shed load. */
  sample(ms: number): boolean {
    if (ms > 250) return false; // tab switch or breakpoint, not real load
    this.average += (ms - this.average) * 0.05;
    if (this.cooldown > 0) {
      this.cooldown--;
      return false;
    }
    this.slowFrames = this.average > 24 ? this.slowFrames + 1 : 0;
    if (this.slowFrames > 90) {
      this.slowFrames = 0;
      this.cooldown = 240;
      return true;
    }
    return false;
  }
}
