import { test } from "node:test";
import assert from "node:assert/strict";
import { CLAW_LAYOUTS, clawShape } from "./claw.ts";

const zone = { x: 700, y: 120, w: 620, h: 780 };
const marks = (d: string) => (d.match(/M/g) ?? []).length;
const xs = (d: string) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1]));

test("the surface is intact before the strike and after scrolling back", () => {
  for (const layout of Object.values(CLAW_LAYOUTS)) {
    const { cuts, ...drawn } = clawShape(layout, zone, 0);
    assert.deepEqual(drawn, { holes: "", trailing: "", strike: "", open: 0 });
    assert.ok(cuts.every((cut) => cut.reach === 0));
    assert.equal(clawShape(layout, zone, -0.4).holes, "");
  }
});

test("three marks land in sequence, then open fully", () => {
  const layout = CLAW_LAYOUTS.edge;
  assert.equal(marks(clawShape(layout, zone, 0.02).holes), 1);
  assert.equal(marks(clawShape(layout, zone, 0.12).holes), 3);
  const full = clawShape(layout, zone, 1);
  assert.equal(full.open, 1);
  assert.equal(marks(full.holes), 3);
  assert.deepEqual(clawShape(layout, zone, 1.6), full);
});

test("the opening only widens as progress grows", () => {
  const spread = (p: number) => {
    const x = xs(clawShape(CLAW_LAYOUTS.edge, zone, p).holes);
    return Math.max(...x) - Math.min(...x);
  };
  let previous = 0;
  for (let p = 0.2; p <= 1; p += 0.1) {
    const now = spread(p);
    assert.ok(now >= previous, `spread shrank at ${p.toFixed(1)}`);
    previous = now;
  }
});

test("the same progress always yields the same edge, so frames never flicker", () => {
  assert.equal(clawShape(CLAW_LAYOUTS.band, zone, 0.63).holes, clawShape(CLAW_LAYOUTS.band, zone, 0.63).holes);
});

test("band marks stay inside their zone", () => {
  const x = xs(clawShape(CLAW_LAYOUTS.band, zone, 1).holes);
  assert.ok(Math.min(...x) >= zone.x && Math.max(...x) <= zone.x + zone.w);
});

/** Outline points of one hole, as (along, across) against its cut's bowed centre line, in pixels. */
const against = (hole: string, cut: { ax: number; ay: number; bx: number; by: number; bow: number }) => {
  const ux = cut.bx - cut.ax;
  const uy = cut.by - cut.ay;
  const len = Math.hypot(ux, uy);
  return [...hole.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => {
    const rx = Number(m[1]) - cut.ax;
    const ry = Number(m[2]) - cut.ay;
    const t = (rx * ux + ry * uy) / (len * len);
    return { t, across: (-rx * uy + ry * ux) / len - cut.bow * Math.sin(Math.PI * t) };
  });
};

test("every mark is listed for the orb, striking in the same sequence as the skin", () => {
  const reaches = (p: number) => clawShape(CLAW_LAYOUTS.edge, zone, p).cuts.map((cut) => cut.reach);
  assert.equal(reaches(0).length, 3);
  const first = reaches(0.02);
  assert.ok(first[0] > 0 && first[1] === 0 && first[2] === 0, `only the first mark has struck at 0.02: ${first}`);
  assert.deepEqual(reaches(0.3), [1, 1, 1]);
});

test("the cut handed to the orb matches the hole drawn on the skin", () => {
  for (const layout of Object.values(CLAW_LAYOUTS)) {
    for (const p of [0.08, 0.3, 0.6, 1]) {
      const shape = clawShape(layout, zone, p);
      const holes = shape.holes.split("M").filter(Boolean);
      assert.equal(holes.length, shape.cuts.filter((cut) => cut.reach > 0).length);
      holes.forEach((hole, i) => {
        const cut = shape.cuts[i];
        const points = against(hole, cut);
        const widest = Math.max(...points.map((point) => Math.abs(point.across)));
        assert.ok(widest <= cut.half * 1.1 + 1, `${p}: hole ${i} reaches ${widest}px across, cut half width ${cut.half}`);
        if (shape.open === 1) assert.ok(widest >= cut.half * 0.9, `${p}: hole ${i} only ${widest}px across for half ${cut.half}`);
        const furthest = Math.max(...points.map((point) => point.t));
        assert.ok(Math.abs(furthest - cut.reach) < 0.02, `${p}: hole ${i} drawn to ${furthest}, cut reach ${cut.reach}`);
      });
    }
  }
});

test("a cut only widens as progress grows, like the hole", () => {
  let previous = 0;
  for (let p = 0.2; p <= 1; p += 0.1) {
    const { half } = clawShape(CLAW_LAYOUTS.band, zone, p).cuts[1];
    assert.ok(half >= previous, `half width shrank at ${p.toFixed(1)}`);
    previous = half;
  }
});
