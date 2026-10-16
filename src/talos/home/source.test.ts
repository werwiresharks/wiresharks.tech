import { test } from "node:test";
import assert from "node:assert/strict";
import { createHomeSource } from "./source.ts";
import { HomeMotion } from "./journey.ts";

// Rectangles captured from the homepage at 1280×800, 1024×768, 768×1024, and 375×667.
const layouts = [
  { width: 1280, height: 800, hero: 800,
    talon: [1095.96, 1488.66, 72, 72], console: [619.23, 1436.66, 572.73, 394.28],
    talos: [340.39, 2223.35, 68, 68], graph: [88.03, 2160.85, 572.73, 488.5],
    section: [56.31, 2028.05, 1167.38, 725.1], platform: [1135.69, 3034.75, 88, 88],
    platformSection: [0, 2893.95, 1280, 1798.59], worker: [109.03, 2365.35, 22, 22], row: 47 },
  { width: 1024, height: 768, hero: 768,
    talon: [857.375, 1345.13, 72, 72], console: [495.58, 1293.13, 457.8, 394.28],
    talos: [265.52, 2098.32, 68, 68], graph: [70.63, 2035.82, 457.79, 488.5],
    section: [45.05, 1907.77, 933.89, 743.6], platform: [890.95, 2876.64, 88, 88],
    platformSection: [0, 2764.01, 1024, 1735.03], worker: [91.63, 2254.32, 22, 22], row: 47 },
  { width: 768, height: 1024, hero: 1213.98,
    talon: [572.57, 2308.08, 72, 72], console: [53.22, 2256.08, 615.35, 394.28],
    talos: [326.89, 3437.54, 68, 68], graph: [53.22, 3375.04, 615.35, 488.5],
    section: [33.79, 2736.59, 654.21, 1180.38], platform: [670.21, 4108.97, 64, 64],
    platformSection: [0, 4012.97, 768, 2452.61], worker: [74.22, 3593.54, 22, 22], row: 47 },
  { width: 375, height: 667, hero: 893.77,
    talon: [274, 2216.02, 44, 44], console: [31, 2164.02, 299, 514.08],
    talos: [158.5, 3642.3, 44, 44], graph: [31, 3584.8, 299, 506],
    section: [20, 2755.9, 321, 1379.9], platform: [315, 4317.8, 40, 40],
    platformSection: [0, 4231.8, 375, 3186.48], worker: [48, 3803.8, 22, 22], row: 50.4 },
];

for (const layout of layouts) test(`source geometry remains continuous and attached at ${layout.width}px`, (t) => {
  let source: ReturnType<typeof createHomeSource> | undefined;
  t.after(() => source?.dispose());
  const viewport = { innerWidth: layout.width, innerHeight: layout.height, scrollY: 0,
    addEventListener() {}, removeEventListener() {} };
  const observer = class { observe() {} disconnect() {} };
  const globals = {
    window: viewport,
    document: { documentElement: { scrollHeight: 12000 }, fonts: {
      addEventListener() {}, removeEventListener() {}, ready: Promise.resolve(),
    } },
    ResizeObserver: observer, MutationObserver: observer,
    getComputedStyle: () => ({ transform: "none" }),
    cancelAnimationFrame() {}, requestAnimationFrame: () => 1,
  };
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  const nodes = new Map();
  const root = { querySelector: (selector: string) => nodes.get(selector), querySelectorAll: (selector: string) => selector === "[data-home-worker]" ? workers : [],
    addEventListener() {}, removeEventListener() {} };
  const node = (rect: number[], panel?: string) => ({
    parentElement: root,
    getBoundingClientRect: () => ({ left: rect[0], top: rect[1] - viewport.scrollY, width: rect[2], height: rect[3], bottom: rect[1] + rect[3] - viewport.scrollY }),
    closest: (selector: string) => selector === panel ? nodes.get(panel) : null,
  });
  nodes.set(".hero", node([0, 0, layout.width, layout.hero]));
  nodes.set('[data-home-stop="talon"]', node(layout.talon, ".home-console"));
  nodes.set(".home-console", node(layout.console));
  nodes.set('[data-home-stop="talos"]', node(layout.talos, ".home-graph"));
  nodes.set(".home-graph", node(layout.graph));
  nodes.set("#talos", node(layout.section));
  nodes.set('[data-home-stop="platform"]', node(layout.platform));
  nodes.set("#platform", node(layout.platformSection));
  const workers = Array.from({ length: 6 }, (_, i) => node([layout.worker[0], layout.worker[1] + i * layout.row, 22, 22]));
  source = createHomeSource(root, () => {});
  if (layout.width === 375) {
    assert.equal(source.sample().mother.y + source.sample().mother.radius, layout.hero - 36);
  }
  const hold = layout.talos[1] + layout.talos[3] / 2 - layout.height * (layout.width < 768 ? 0.34 : 0.42);
  const leave = layout.graph[1] + layout.graph[3] - layout.height * 0.28;
  const sample = (scroll: number) => { viewport.scrollY = scroll; return structuredClone(source.sample()); };
  for (const boundary of [hold, leave]) {
    const before = sample(boundary - 0.001);
    const after = sample(boundary + 0.001);
    assert.ok(Math.hypot(before.mother.x - after.mother.x, before.mother.y - after.mother.y) < 0.02);
  }
  assert.ok(sample(hold).satellites.slice(0, 6).every((s) => s.mix === 1));
  const motion = new HomeMotion();
  motion.step(sample(hold - 100), 0);
  for (let frame = 0; frame < 180; frame++) motion.step(sample(hold + 10), 1 / 60);
  for (const scroll of [hold + 30, hold + 100, hold + 50, leave - 1]) {
    const target = sample(scroll);
    assert.equal(target.docked, true);
    const frame = motion.step(target, 1 / 60);
    assert.deepEqual(frame.mother, target.mother);
    assert.ok(frame.satellites.slice(0, 6).every((satellite) => satellite.mix === 1));
  }
  const forward = sample(leave + 70);
  sample(leave + 300);
  assert.deepEqual(sample(leave + 70), forward);
  let previous = sample(hold - 250).mother;
  for (let scroll = hold - 248; scroll < leave + 300; scroll += 2) {
    const current = sample(scroll).mother;
    assert.ok(Math.hypot(current.x - previous.x, current.y - previous.y) < 45, `continuous travel at ${scroll} from ${JSON.stringify(previous)} to ${JSON.stringify(current)}`);
    previous = current;
  }
  if (layout.width === 1280) {
    const gap = layout.section[1] + 24;
    const crossingMiddle = (layout.console[1] + layout.console[3] - layout.height * 0.28 + layout.height * 0.1) + layout.height * 0.06;
    const crossing = sample(crossingMiddle).mother;
    assert.ok(crossing.x > 46 && crossing.x < layout.width - 46);
    assert.ok(Math.abs(crossing.y + crossingMiddle - gap) < 0.01, "rail crossing stays in the section gap");
  }
});
