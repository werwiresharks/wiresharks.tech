import { test } from "node:test";
import assert from "node:assert/strict";
import { CLAW_LAYOUTS, clawShape } from "./claw.ts";

const zone = { x: 700, y: 120, w: 620, h: 780 };
const marks = (d: string) => (d.match(/M/g) ?? []).length;
const xs = (d: string) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1]));

test("the surface is intact before the strike and after scrolling back", () => {
  for (const layout of Object.values(CLAW_LAYOUTS)) {
    assert.deepEqual(clawShape(layout, zone, 0), { holes: "", strike: "", open: 0 });
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
