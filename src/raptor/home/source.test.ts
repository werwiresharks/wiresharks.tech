import { test } from "node:test";
import assert from "node:assert/strict";
import { createHomeSource } from "./source.ts";
import { heroFrame, HomeMotion } from "./journey.ts";

// Rectangles captured from the homepage at 1280×800, 1024×768, 768×1024, 375×667, and 390×844.
// Raptor-1's task graph (the "raptor" stop) sits above Talon-1's console (the "talon" stop).
const layouts = [
  { width: 1280, height: 800, hero: 800, products: [1135.69, 940.8, 88, 88],
    raptor: [871.59, 1385.95, 68, 68], graph: [619.23, 1323.45, 572.72, 488.5],
    section: [56.31, 1192.77, 1167.38, 748.89], worker: [640.23, 1541.95, 22, 22], row: 47,
    talon: [564.75, 2217.67, 72, 72], console: [88.03, 2165.67, 572.72, 394.44],
    talonSection: [56.31, 1974.45, 1167.38, 775.89],
    platform: [1135.69, 5657.23, 88, 88], platformSection: [0, 5516.44, 1280, 1747.92] },
  { width: 1024, height: 768, hero: 768, products: [890.95, 880.63, 88, 88],
    raptor: [690.47, 1296.48, 68, 68], graph: [495.56, 1233.98, 457.81, 488.5],
    section: [45.05, 1104.55, 933.91, 746.39], worker: [516.56, 1452.48, 22, 22], row: 47,
    talon: [432.42, 2136.2, 72, 72], console: [70.61, 2084.2, 457.81, 394.44],
    talonSection: [45.05, 1883.73, 933.91, 794.39],
    platform: [890.95, 5313.7, 88, 88], platformSection: [0, 5201.08, 1024, 1756.64] },
  { width: 768, height: 1024, hero: 1213.97, products: [624, 1309.97, 64, 64],
    raptor: [326.89, 2221.77, 68, 68], graph: [53.2, 2159.27, 615.38, 488.5],
    section: [33.78, 1511.03, 654.22, 1204.16], worker: [74.2, 2377.77, 22, 22], row: 47,
    talon: [572.58, 3496.22, 72, 72], console: [53.2, 3444.22, 615.38, 394.44],
    talonSection: [33.78, 2747.98, 654.22, 1158.09],
    platform: [670.22, 7125.56, 64, 64], platformSection: [0, 7029.56, 768, 2474.23] },
  { width: 375, height: 667, hero: 880.92, products: [301, 966.92, 40, 40],
    raptor: [158.5, 2121.16, 44, 44], graph: [31, 2063.66, 299, 506],
    section: [20, 1248.75, 321, 1379.91], worker: [48, 2282.66, 22, 22], row: 55.5,
    talon: [274, 3600.36, 44, 44], console: [31, 3548.36, 299, 514.34],
    talonSection: [20, 2661.45, 321, 1460.25],
    platform: [315, 6468.67, 40, 40], platformSection: [0, 6382.67, 375, 3229.77] },
  { width: 390, height: 844, hero: 892.44, products: [316, 978.44, 40, 40],
    raptor: [166, 2132.67, 44, 44], graph: [31, 2075.17, 314, 489],
    section: [20, 1260.27, 336, 1362.91], worker: [48, 2294.17, 22, 22], row: 47,
    talon: [289, 3570.88, 44, 44], console: [31, 3518.88, 314, 514.34],
    talonSection: [20, 2655.97, 336, 1436.25],
    platform: [330, 6863.98, 40, 40], platformSection: [0, 6777.98, 390, 3229.77] },
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
    querySelector: (selector: string) => nodes.get(selector),
    querySelectorAll: () => [],
  });
  nodes.set(".hero", node([0, 0, layout.width, layout.hero]));
  // Phones stack the orb slot under the buttons, above the countdown.
  const orb = Math.min(layout.width * 0.46, 220);
  const slot = [(layout.width - orb) / 2, layout.hero - orb - 160, orb, orb];
  if (layout.width < 768) nodes.set(".hero-orb-slot", node(slot));
  nodes.set('[data-home-stop="products"]', node(layout.products));
  nodes.set('[data-home-stop="talon"]', node(layout.talon, ".home-console"));
  nodes.set(".home-console", node(layout.console));
  nodes.set('[data-home-stop="raptor"]', node(layout.raptor, ".home-graph"));
  nodes.set(".home-graph", node(layout.graph));
  nodes.set("#raptor", node(layout.section));
  nodes.set("#talon", node(layout.talonSection));
  nodes.set('[data-home-stop="platform"]', node(layout.platform));
  nodes.set("#platform", node(layout.platformSection));
  const workers = Array.from({ length: 6 }, (_, i) => node([layout.worker[0], layout.worker[1] + i * layout.row, 22, 22]));
  source = createHomeSource(root, () => {});
  if (layout.width < 768) {
    const { mother } = source.sample();
    assert.deepEqual(mother, { x: layout.width / 2, y: slot[1] + orb / 2, radius: orb / 2 });
  }
  const center = layout.raptor[1] + layout.raptor[3] / 2;
  const satelliteLeave = layout.graph[1] + layout.graph[3] - layout.height * 0.28;
  const leave = center - (layout.width < 768 ? 64 : 76) - layout.raptor[2] / 2 - 40 - layout.height * 0.12;
  const sample = (scroll: number) => { viewport.scrollY = scroll; return structuredClone(source.sample()); };
  // The orb docks as the coordinator mark reaches the hold line, or a few pixels later when the
  // products departure just above leaves its approach less room. Bisect for that moment.
  const line = center - layout.height * (layout.width < 768 ? 0.44 : 0.5);
  let [undocked, docked] = [line - layout.height * 0.1, line + layout.height * 0.05];
  assert.ok(!sample(undocked).docked && sample(docked).docked);
  while (docked - undocked > 1e-4) {
    const mid = (undocked + docked) / 2;
    if (sample(mid).docked) docked = mid;
    else undocked = mid;
  }
  const hold = docked;
  assert.ok(hold - line < layout.height * 0.01, "the orb docks as the coordinator mark reaches the hold line");
  for (const boundary of [hold, leave]) {
    const before = sample(boundary - 0.001);
    const after = sample(boundary + 0.001);
    assert.ok(Math.hypot(before.mother.x - after.mother.x, before.mother.y - after.mother.y) < 0.02);
  }
  assert.ok(sample(hold).satellites.slice(0, 6).every((s) => s.mix === 1));
  const heroExit = layout.width < 768 ? Math.max(1, slot[1] - 64 - 50) + layout.height * 0.4 : layout.height * 0.7;
  if (layout.width >= 1024) {
    assert.ok(sample(150).mother.radius > heroFrame(layout.width, layout.hero).radius * 0.75);
    assert.ok(sample(360).mother.radius > 65, "hero shrink remains spread over the scroll rather than reaching the rail by 360px");
  }
  const travel = new HomeMotion();
  for (let scroll = 0; scroll < 10500; scroll += 2.5) {
    const target = sample(scroll);
    const rendered = travel.step(target, 1 / 60);
    if (layout.width < 1024 && scroll <= heroExit) continue;
    for (const mother of [target.mother, rendered.mother]) {
      assert.ok(mother.x - mother.radius >= 0 && mother.x + mother.radius <= layout.width, `horizontal bounds at ${scroll}`);
      assert.ok(mother.y - mother.radius >= (layout.width < 768 ? 64 : 76), `header clearance at ${scroll}: ${JSON.stringify(mother)}`);
      assert.ok(mother.y + mother.radius <= layout.height, `bottom clearance at ${scroll}`);
    }
  }
  const motion = new HomeMotion();
  motion.step(sample(hold - 100), 0);
  for (let frame = 0; frame < 180; frame++) motion.step(sample(hold + 10), 1 / 60);
  for (const scroll of [hold + 10, (hold + leave) / 2, hold + 20, leave - 1]) {
    const target = sample(scroll);
    assert.equal(target.docked, true);
    const frame = motion.step(target, 1 / 60);
    assert.deepEqual(frame.mother, target.mother);
    assert.ok(frame.satellites.slice(0, 6).every((satellite) => satellite.mix === 1));
  }
  for (let scroll = leave; scroll <= leave + layout.height * 0.1; scroll += 2) {
    const mother = sample(scroll).mother;
    assert.ok(Math.abs(mother.y + scroll - center) < 0.01, "departure stays above coordinator text until it reaches the rail");
  }
  assert.ok(sample(leave + 20).satellites.slice(0, 6).every((satellite) => satellite.mix === 1), "worker rows stay attached after the mother departs");
  assert.ok(sample(satelliteLeave + layout.height * 0.18).satellites.every((satellite) => satellite.mix === 0));
  const forward = sample(leave + 70);
  sample(leave + 300);
  assert.deepEqual(sample(leave + 70), forward);
  let previous = sample(hold - 250).mother;
  for (let scroll = hold - 248; scroll < leave + 300; scroll += 2) {
    const current = sample(scroll).mother;
    assert.ok(Math.hypot(current.x - previous.x, current.y - previous.y) < 45, `continuous travel at ${scroll} from ${JSON.stringify(previous)} to ${JSON.stringify(current)}`);
    previous = current;
  }
  if (layout.width >= 1024) {
    // Side by side, the graph sits right of Raptor-1's copy and the console left of Talon-1's.
    // The orb comes in on its panel's side, so it crosses the page above Talon-1's block.
    for (const [mark, right] of [[layout.raptor, true], [layout.talon, false]] as const) {
      const dock = mark[1] + mark[3] / 2 - layout.height * 0.5;
      for (let scroll = dock - layout.height * 0.12; scroll <= dock; scroll += 4) {
        const { x } = sample(scroll).mother;
        assert.equal(x > layout.width / 2, right, `approaches the ${right ? "graph from the right" : "console from the left"} at ${scroll}`);
      }
    }
    const gap = layout.talonSection[1] + 24;
    const crossingMiddle = gap - layout.height * 0.5 - layout.height * 0.1;
    const crossing = sample(crossingMiddle).mother;
    assert.ok(crossing.x > 46 && crossing.x < layout.width - 46);
    assert.ok(Math.abs(crossing.y + crossingMiddle - gap) < 0.01, "rail crossing stays in the section gap");
  }
});

test("the stream runs the length of the page and gathers into the release orb beside its copy", (t) => {
  let source: ReturnType<typeof createHomeSource> | undefined;
  t.after(() => source?.dispose());
  const viewport = { innerWidth: 1440, innerHeight: 900, scrollY: 0, addEventListener() {}, removeEventListener() {} };
  const observer = class { observe() {} disconnect() {} };
  const globals = {
    window: viewport,
    document: { documentElement: { scrollHeight: 8017 }, fonts: { addEventListener() {}, removeEventListener() {}, ready: Promise.resolve() } },
    ResizeObserver: observer, MutationObserver: observer,
    getComputedStyle: () => ({ transform: "none" }),
    cancelAnimationFrame() {}, requestAnimationFrame: () => 1,
  };
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  // Rectangles captured from the homepage at 1440×900.
  const root = { querySelector: (selector: string) => nodes.get(selector), querySelectorAll: () => [], addEventListener() {}, removeEventListener() {} };
  const node = (rect: number[], children: unknown[] = []) => ({
    parentElement: root,
    children,
    getBoundingClientRect: () => ({ left: rect[0], right: rect[0] + rect[2], top: rect[1] - viewport.scrollY, width: rect[2], height: rect[3], bottom: rect[1] + rect[3] - viewport.scrollY }),
    closest: () => null,
    querySelector: () => undefined,
    querySelectorAll: () => [],
  });
  const section = [0, 6911, 1440, 697];
  const copy = [80, 7169, 719, 281];
  const nodes = new Map<string, unknown>([
    [".hero", node([0, 0, 1440, 900])],
    [".products .wrap", node([80, 900, 1280, 600])],
    [".faq", node([0, 6233, 1440, 678])],
    [".closing", node(section)],
    [".closing-inner > div", node(copy)],
    [".closing-launch", node([847, 7406, 513, 44])],
    [".closing-ctas", node([80, 7402, 719, 48], [node([80, 7402, 175, 48]), node([267, 7402, 146, 48])])],
    [".closing .section-lede", node([80, 7290, 719, 56])],
  ]);
  const created = createHomeSource(root as unknown as HTMLElement, () => {});
  source = created;
  const sample = (scroll: number) => { viewport.scrollY = scroll; return structuredClone(created.sample()); };
  const settle = section[1] + section[3] / 2 - 450;
  // The release orb fills the space beside its copy.
  const full = sample(settle);
  assert.equal(full.flow.weight, 0);
  assert.ok(full.mother.radius > section[3] * 0.45, `release orb radius ${full.mother.radius}`);
  assert.ok(full.mother.x - full.mother.radius >= copy[0] + copy[2], "orb clears the copy column");
  assert.ok(full.mother.x + full.mother.radius <= 1440 + full.mother.radius * 0.3 + 0.01, "at most 30% leaves the right edge");
  assert.equal(full.warm, 1);
  assert.ok(sample(7117).opacity > 0.99, "the release orb does not fade at the end of the page");
  // From the first scroll until the release section centres, the page is one stream.
  const top = sample(0);
  assert.equal(top.flow.weight, 0, "the hero orb is whole at the top");
  let previous = top;
  for (let scroll = 2; scroll < settle; scroll += 2) {
    const current = sample(scroll);
    assert.equal(current.flow.weight, 1, `stream at ${scroll}`);
    assert.ok(current.flow.dissolve >= previous.flow.dissolve && current.flow.gather >= previous.flow.gather);
    assert.ok(current.flow.river.x - current.flow.river.width >= 1360, "the river stays in the gutter, clear of the content");
    assert.equal(current.opacity, 1);
    const { mother } = current;
    assert.ok(Math.hypot(mother.x - previous.mother.x, mother.y - previous.mother.y) < 6 && Math.abs(mother.radius - previous.mother.radius) < 6, `continuous at ${scroll}`);
    previous = current;
  }
  assert.ok(sample(1500).flow.dissolve === 1 && sample(1500).flow.gather === 0, "mid-page it is purely a stream");
  // The hand-back to the release orb is seamless.
  const last = sample(settle - 0.5);
  assert.ok(Math.hypot(last.mother.x - full.mother.x, last.mother.y - full.mother.y) < 1 && Math.abs(last.mother.radius - full.mother.radius) < 1);
  // Scroll back up: identical states, in reverse.
  assert.deepEqual(sample(3000), sample(3000));
});
