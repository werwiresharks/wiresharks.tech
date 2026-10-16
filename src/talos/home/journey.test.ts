import { test } from "node:test";
import assert from "node:assert/strict";
import { createHomeFrame, heroFrame, HomeMotion, sampleHomeFrame } from "./journey.ts";
import type { HomeGeometry } from "./journey.ts";
import { ParticleField } from "../engine/particles.ts";

function geometry(): HomeGeometry {
  return {
    height: 800,
    mobile: false,
    end: 4000,
    stops: [
      { at: 0, frame: { x: 900, y: 400, radius: 240 } },
      { at: 800, frame: { x: 1100, y: 1100, radius: 40 } },
      { at: 1400, frame: { x: 300, y: 1700, radius: 32 } },
      { at: 1800, frame: { x: 300, y: 1700, radius: 32 } },
    ],
    docks: [{
      enter: 1250,
      leave: 1650,
      satellites: Array.from({ length: 6 }, (_, i) => ({
        key: `worker-${i}`, frame: { x: 120, y: 1800 + i * 50, radius: 9 },
      })),
    }],
  };
}

test("scroll sampling is reversible and reuses the same pose and satellite objects", () => {
  const g = geometry();
  const pose = createHomeFrame();
  const satellites = [...pose.satellites];
  const forward = structuredClone(sampleHomeFrame(g, 1460, pose));
  sampleHomeFrame(g, 2400, pose);
  assert.equal(sampleHomeFrame(g, 1460, pose), pose);
  assert.deepEqual(pose, forward);
  assert.ok(satellites.every((item, i) => item === pose.satellites[i]));
});

test("worker cohorts seed with a short stagger, align to document slots, and recombine", () => {
  const g = geometry();
  const pose = createHomeFrame();
  sampleHomeFrame(g, 1300, pose);
  assert.ok(pose.satellites[0].mix > pose.satellites[5].mix);
  sampleHomeFrame(g, 1500, pose);
  for (let i = 0; i < 6; i++) {
    assert.equal(pose.satellites[i].mix, 1);
    assert.deepEqual(pose.satellites[i].frame, { x: 120, y: 300 + i * 50, radius: 9 });
  }
  sampleHomeFrame(g, 1900, pose);
  assert.ok(pose.satellites.every((item) => item.mix === 0));
});

test("poses stay continuous at section boundaries and fade at the closing", () => {
  const g = geometry();
  for (const at of [800, 1250, 1400, 1650, 1800]) {
    const before = sampleHomeFrame(g, at - 0.001, createHomeFrame());
    const after = sampleHomeFrame(g, at + 0.001, createHomeFrame());
    assert.ok(Math.hypot(before.mother.x - after.mother.x, before.mother.y - after.mother.y) < 0.01);
    assert.ok(Math.abs(before.mother.radius - after.mother.radius) < 0.01);
  }
  assert.equal(sampleHomeFrame(g, 4000, createHomeFrame()).opacity, 0);
});

test("particle cohorts retain buffers, budget and identity through a complete morph", () => {
  const field = new ParticleField(3000);
  const g = geometry();
  const pose = createHomeFrame();
  const buffers = [field.position, field.color, field.params];
  field.setTargets = () => { throw new Error("A homepage frame must never reassign event particles"); };
  sampleHomeFrame(g, 1460, pose);
  field.stepHome(pose, 1280, 800, 4, 0);
  const positions = field.position.slice();
  sampleHomeFrame(g, 1900, pose);
  field.stepHome(pose, 1280, 800, 4, 0);
  sampleHomeFrame(g, 1460, pose);
  field.stepHome(pose, 1280, 800, 4, 0);
  assert.deepEqual(field.position, positions);
  assert.equal(field.active, 3000);
  assert.equal(field.position, buffers[0]);
  assert.equal(field.color, buffers[1]);
  assert.equal(field.params, buffers[2]);
  assert.ok(field.position.every(Number.isFinite));
});

test("hero framing keeps the original desktop and smaller mobile compositions", () => {
  const desktop = heroFrame(1440, 1000, 685);
  assert.ok(desktop.x - desktop.radius >= 685, "the desktop orb clears the hero copy");
  assert.ok(desktop.x + desktop.radius <= 1440, "the desktop orb stays fully visible");
  assert.ok(desktop.radius > 300, "the desktop orb stays prominent");
  const tablet = heroFrame(768, 1024, 688, 598);
  assert.ok(tablet.y + tablet.radius <= 598 - 24, "the tablet orb ends above the stacked copy");
  assert.ok(tablet.radius > 200, "the tablet orb stays prominent");
  assert.ok(heroFrame(390, 844).radius < heroFrame(1440, 1000).radius);
  const mobile = heroFrame(390, 844);
  assert.equal(mobile.x, 195);
  assert.equal(mobile.y + mobile.radius, 808);
});


test("the mother remains inside the viewport when its document dock scrolls away", () => {
  for (const mobile of [false, true]) {
    const g = { ...geometry(), mobile, width: mobile ? 390 : 1280 };
    for (let scroll = 0; scroll < 4000; scroll += 5) {
      const { mother } = sampleHomeFrame(g, scroll, createHomeFrame());
      assert.ok(mother.x - mother.radius >= 0);
      assert.ok(mother.x + mother.radius <= g.width);
      assert.ok(mother.y - mother.radius >= (mobile ? 64 : 76));
      assert.ok(mother.y + mother.radius <= g.height);
    }
  }
});

test("docked worker spheres continue to animate without moving their document centers", () => {
  const field = new ParticleField(3000);
  const pose = sampleHomeFrame(geometry(), 1500, createHomeFrame());
  const centers = structuredClone(pose.satellites);
  field.stepHome(pose, 1280, 800, 4, 0);
  const before = field.position.slice();
  field.stepHome(pose, 1280, 800, 4, 1);
  assert.notDeepEqual(field.position.slice(0, 18), before.slice(0, 18));
  assert.deepEqual(pose.satellites, centers);
});

test("wheel jumps ease into place without overshoot and leave docked markers aligned", () => {
  const motion = new HomeMotion();
  const target = createHomeFrame();
  target.mother = { x: 200, y: 400, radius: 90 };
  motion.step(target, 0);
  target.mother = { x: 1000, y: 200, radius: 22 };
  target.satellites[0].frame = { x: 120, y: 300, radius: 9 };
  target.satellites[0].mix = 1;
  let previous = 200;
  for (let i = 0; i < 120; i++) {
    const pose = motion.step(target, 1 / 60);
    assert.ok(pose.mother.x >= previous && pose.mother.x <= 1000);
    if (i === 0) assert.ok(pose.mother.x < 220);
    assert.deepEqual(pose.satellites[0].frame, target.satellites[0].frame);
    previous = pose.mother.x;
  }
  assert.ok(Math.abs(previous - 1000) < 0.01);
});

test("a settled harness sphere stays attached to its panel until the reader moves on", () => {
  const g = geometry();
  g.width = 1280;
  g.stops = [
    { at: 1200, frame: { x: 300, y: 1700, radius: 34 } },
    { at: 1420, frame: { x: 300, y: 1700, radius: 34 } },
  ];
  g.docks[0].enter = 1050;
  g.docks[0].holdFrom = 1200;
  g.docks[0].leave = 1420;
  for (const scroll of [1250, 1300, 1400]) {
    const pose = sampleHomeFrame(g, scroll, createHomeFrame());
    assert.deepEqual(pose.mother, { x: 300, y: 1700 - scroll, radius: 34 });
    assert.ok(pose.satellites.slice(0, 6).every((satellite) => satellite.mix === 1));
  }
});

test("docking eases accumulated travel error before exact attachment and continuous departure", () => {
  const motion = new HomeMotion();
  const target = createHomeFrame();
  target.mother = { x: 500, y: 400, radius: 34 };
  motion.step(target, 0);
  target.mother.x = 300;
  let previous = 500;
  for (let i = 0; i < 9; i++) previous = motion.step(target, 1 / 60).mother.x;
  target.docked = true;
  const entry = motion.step(target, 1 / 60).mother.x;
  assert.ok(previous - entry < 15);
  assert.ok(entry > 300);
  for (let i = 0; i < 150; i++) motion.step(target, 1 / 60);
  assert.deepEqual(motion.step(target, 1 / 60).mother, target.mother);
  for (const scroll of [20, 80, 40, 100, 0]) {
    target.scroll = scroll;
    target.mother.y = 400 - scroll;
    assert.deepEqual(motion.step(target, 1 / 60).mother, target.mother);
  }
  target.docked = false;
  target.mother.x = 1000;
  const departing = motion.step(target, 1 / 60);
  assert.ok(departing.mother.x > 300 && departing.mother.x < 320);
  for (let i = 0; i < 9; i++) motion.step(target, 1 / 60);
  const beforeReverse = departing.mother.x;
  target.mother.x = 300;
  target.docked = true;
  const reverse = motion.step(target, 1 / 60);
  assert.ok(Math.abs(reverse.mother.x - beforeReverse) < 45);
  assert.ok(reverse.mother.x > 300);
  for (let i = 0; i < 180; i++) motion.step(target, 1 / 60);
  assert.deepEqual(motion.step(target, 1 / 60).mother, target.mother);
});

test("the mother stays spherical throughout travel and reverse scrolling", () => {
  const field = new ParticleField(3000);
  const g = geometry();
  const unit = 4 / 800;
  const buffer = field.position;
  for (const scroll of [0, 400, 800, 1100, 1400, 1800, 1400, 1100, 400, 0]) {
    const pose = sampleHomeFrame(g, scroll, createHomeFrame());
    field.stepHome(pose, 1280, 800, 4, 0);
    let extent = 0;
    for (let i = 10; i < field.active; i += 50) {
      const radius = Math.hypot(
        field.position[i * 3] - (pose.mother.x - 640) * unit,
        field.position[i * 3 + 1] - (400 - pose.mother.y) * unit,
        field.position[i * 3 + 2],
      );
      assert.ok(radius <= pose.mother.radius * unit + 0.000001);
      extent = Math.max(extent, radius);
    }
    assert.ok(extent > pose.mother.radius * unit * 0.95);
    assert.equal(field.position, buffer);
    assert.ok(field.position.every(Number.isFinite));
  }
});

for (const capacity of [7150, 1430]) test(`minimum homepage quality retains recognizable shells with capacity ${capacity}`, () => {
  const field = new ParticleField(capacity);
  field.setActive(Math.min(2400, capacity));
  const pose = createHomeFrame();
  pose.mother = { x: 195, y: 240, radius: 22 };
  for (let i = 0; i < 6; i++) {
    pose.satellites[i].frame = { x: 60, y: 180 + i * 50, radius: 7 };
    pose.satellites[i].mix = 1;
  }
  field.stepHome(pose, 390, 667, 4, 0);
  const visible = new Array(7).fill(0);
  const extents = Array.from({ length: 6 }, () => ({ left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }));
  for (let i = 0; i < field.active; i++) {
    if (field.params[i * 4] < 0.1) continue;
    const cohort = i % 50;
    visible[cohort < 6 ? cohort : 6]++;
    if (cohort >= 6) continue;
    const x = field.position[i * 3] * 667 / 4 + 195;
    const y = 667 / 2 - field.position[i * 3 + 1] * 667 / 4;
    const extent = extents[cohort];
    extent.left = Math.min(extent.left, x);
    extent.right = Math.max(extent.right, x);
    extent.top = Math.min(extent.top, y);
    extent.bottom = Math.max(extent.bottom, y);
  }
  assert.ok(visible[6] >= 300, `mother has ${visible[6]} visible particles`);
  for (let i = 0; i < 6; i++) {
    assert.ok(visible[i] >= (capacity < 2400 ? 20 : 28), `worker ${i} has ${visible[i]} visible particles`);
    assert.ok(extents[i].right - extents[i].left > 10, JSON.stringify(extents[i]));
    assert.ok(extents[i].bottom - extents[i].top > 10, JSON.stringify(extents[i]));
  }
  assert.equal(field.active, Math.min(capacity, 2400));
  assert.equal(field.capacity, capacity);
});

test("small orbs wander and breathe while the hero sphere keeps its rigid spin", () => {
  const movement = (radius: number, mix: number) => {
    const field = new ParticleField(3000);
    const pose = createHomeFrame();
    pose.mother = { x: 640, y: 400, radius };
    pose.satellites[0].frame = { x: 200, y: 300, radius: 9 };
    pose.satellites[0].mix = mix;
    field.stepHome(pose, 1280, 800, 4, 10);
    const before = field.position.slice();
    const alpha = field.params.slice();
    field.stepHome(pose, 1280, 800, 4, 10.5);
    let shift = 0;
    let fade = 0;
    // A rigid spin keeps every radius and alpha unchanged.
    for (let i = 0; i < field.active; i++) {
      const at = (p: Float32Array) => Math.hypot(p[i * 3] - (pose.mother.x - 640) * 4 / 800, p[i * 3 + 1], p[i * 3 + 2]);
      if (i % 50 >= 10) shift += Math.abs(at(field.position) - at(before));
      fade += Math.abs(field.params[i * 4] - alpha[i * 4]);
    }
    return { shift, fade };
  };
  const hero = movement(300, 0);
  const dock = movement(34, 1);
  assert.ok(hero.fade === 0 && hero.shift < dock.shift / 1000, JSON.stringify({ hero, dock }));
  assert.ok(dock.fade > 0, JSON.stringify(dock));
});
