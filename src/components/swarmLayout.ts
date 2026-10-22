/**
 * Geometry and timing for the homepage swarm figure. One task splits into
 * jobs for specialized workers, the workers run in parallel, and their results
 * combine in one shared report, as scroll progress runs 0 → 1 through three
 * stages. Pure, so the figure can be tested without a DOM. Coordinates are CSS
 * pixels in the figure's box.
 */

export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
/**
 * A connector. A sweep is an S-curve that leaves and arrives horizontally. An
 * elbow runs straight to `corner` and turns there on a rounded bend, so elbows
 * that share a start or an end share one straight trunk.
 */
export type Route = { kind: "sweep"; from: Point; to: Point } | { kind: "elbow"; from: Point; corner: Point; to: Point };

export const TASK = "Secure acme/api";

/** One job per agent: its card label, its report row label, and the row's illustrative fill. */
const ROLES = [
  { name: "Auth worker", short: "Auth", weight: 0.64 },
  { name: "API worker", short: "API", weight: 0.88 },
  { name: "Dependency worker", short: "Dependencies", weight: 0.52 },
  { name: "Storage worker", short: "Storage", weight: 0.36 },
  { name: "Pipeline worker", short: "Pipeline", weight: 0.44 },
  { name: "Cloud worker", short: "Cloud", weight: 0.7 },
];
/** Narrow boxes show four agents. */
const COMPACT = ["Auth", "API", "Dependencies", "Cloud"];

/** Boxes narrower than this stack the figure top to bottom. */
export const ROW_MIN_WIDTH = 640;

/** Advance widths of the figure's text: 12px Geist Mono labels (with their 0.02em tracking) and the 13px Geist titles. */
const MONO_ADVANCE = 7.24;
const TITLE_ADVANCE = 7.6;

export type SwarmAgent = {
  name: string;
  short: string;
  weight: number;
  card: Rect;
  /** Where the agent's mark settles in its card. */
  at: Point;
  /** Where the card's label starts, on its baseline. */
  label: Point;
  /** The card's progress track, left to right, which fills as the agent works. */
  work: [Point, Point];
  /** The path out of the task to the agent; the mark travels it. */
  trail: Route;
  /** The path the agent's results take from its card to the report. */
  finding: Route;
  /** The report row its results fill, and that row's bar track. */
  row: Rect;
  bar: [Point, Point];
};

export type SwarmLayout = {
  /** "row" runs left to right; "column" runs top to bottom. */
  flow: "row" | "column";
  width: number;
  height: number;
  task: Rect;
  /** Where the task's caption and title start, on their baselines. */
  caption: Point;
  title: Point;
  /** Where the trails leave the task. */
  origin: Point;
  agentMark: number;
  report: Rect;
  agents: SwarmAgent[];
};

/** Agent card rhythm: the mark and label on one line, the progress track along the bottom. */
const CARD = { h: 40, line: -3, mark: 19, text: 36, end: 14, track: 12, inset: 10 };
/** Report panel rhythm: header, one row per agent, bottom padding, and the row label's inset. */
const REPORT = { head: 44, row: 26, foot: 12 };
const COMPACT_REPORT = { head: 34, row: 20, foot: 8 };
const ROW_TEXT = 28;
const INSET = 14;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const clamp01 = (v: number) => clamp(v, 0, 1);
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const longest = (labels: string[]) => Math.max(...labels.map((label) => label.length));

const BEND = 10;
const round = (v: number) => Math.round(v * 100) / 100;

function sweepControls({ from, to }: { from: Point; to: Point }) {
  const m = (from.x + to.x) / 2;
  return [{ x: m, y: from.y }, { x: m, y: to.y }];
}

/** An elbow's two legs: where each leaves the bend, their directions, and the bend's radius. */
function legs({ from, corner, to }: Extract<Route, { kind: "elbow" }>) {
  const first = Math.hypot(corner.x - from.x, corner.y - from.y);
  const second = Math.hypot(to.x - corner.x, to.y - corner.y);
  const r = Math.min(BEND, first, second);
  const d1 = { x: (corner.x - from.x) / first, y: (corner.y - from.y) / first };
  const d2 = { x: (to.x - corner.x) / second, y: (to.y - corner.y) / second };
  const enter = { x: corner.x - d1.x * r, y: corner.y - d1.y * r };
  const leave = { x: corner.x + d2.x * r, y: corner.y + d2.y * r };
  return { first: first - r, second: second - r, r, d1, d2, enter, leave };
}

/** The point `t` of the way along a route: by the curve's parameter for a sweep, by length for an elbow. */
function pointOn(route: Route, t: number): Point {
  if (route.kind === "sweep") {
    const [b, c] = sweepControls(route);
    const { from: a, to: d } = route;
    const u = 1 - t;
    const k0 = u * u * u;
    const k1 = 3 * u * u * t;
    const k2 = 3 * u * t * t;
    const k3 = t * t * t;
    return { x: k0 * a.x + k1 * b.x + k2 * c.x + k3 * d.x, y: k0 * a.y + k1 * b.y + k2 * c.y + k3 * d.y };
  }
  const { first, second, r, d1, d2, enter, leave } = legs(route);
  const arc = (Math.PI / 2) * r;
  let s = t * (first + arc + second);
  if (s <= first) return { x: route.from.x + d1.x * s, y: route.from.y + d1.y * s };
  s -= first;
  if (s <= arc) {
    const angle = s / r;
    const centre = { x: enter.x + d2.x * r, y: enter.y + d2.y * r };
    return {
      x: centre.x - d2.x * r * Math.cos(angle) + d1.x * r * Math.sin(angle),
      y: centre.y - d2.y * r * Math.cos(angle) + d1.y * r * Math.sin(angle),
    };
  }
  s -= arc;
  return { x: leave.x + d2.x * s, y: leave.y + d2.y * s };
}

export function routePath(route: Route): string {
  const at = ({ x, y }: Point) => `${round(x)} ${round(y)}`;
  if (route.kind === "sweep") {
    const [b, c] = sweepControls(route);
    return `M${at(route.from)}C${at(b)} ${at(c)} ${at(route.to)}`;
  }
  const { r, d1, d2, enter, leave } = legs(route);
  const clockwise = d1.x * d2.y - d1.y * d2.x > 0 ? 1 : 0;
  return `M${at(route.from)}L${at(enter)}A${round(r)} ${round(r)} 0 0 ${clockwise} ${at(leave)}L${at(route.to)}`;
}

/** The narrowest card that fits every label. */
const cardWidth = (roles: typeof ROLES) => Math.ceil(CARD.text + longest(roles.map(({ name }) => name)) * MONO_ADVANCE + CARD.end);

function card(x: number, w: number, mid: number) {
  const line = mid + CARD.line;
  return {
    card: { x, y: mid - CARD.h / 2, w, h: CARD.h },
    at: { x: x + CARD.mark, y: line },
    label: { x: x + CARD.text, y: line + 4 },
    work: [
      { x: x + CARD.inset, y: mid + CARD.track },
      { x: x + w - CARD.inset, y: mid + CARD.track },
    ] as [Point, Point],
  };
}

function reportRow(report: Rect, head: number, height: number, i: number, barX: number) {
  const row = { x: report.x, y: report.y + head + i * height, w: report.w, h: height };
  const y = row.y + row.h / 2;
  return { row, bar: [{ x: barX, y }, { x: report.x + report.w - INSET, y }] as [Point, Point] };
}

/** Left to right: the task, a column of agents, then the report. */
function rowLayout(width: number, height: number): SwarmLayout {
  const pad = 20;
  const n = ROLES.length;
  const cardW = cardWidth(ROLES);
  const task = { x: pad, y: height / 2 - 29, w: Math.ceil(TASK.length * TITLE_ADVANCE + 2 * INSET), h: 58 };
  const reportW = clamp(width * 0.26, 196, 260);
  const reportH = REPORT.head + n * REPORT.row + REPORT.foot;
  const report = { x: width - pad - reportW, y: (height - reportH) / 2, w: reportW, h: reportH };
  // The fan out of the task takes a little more of the free width than the fan into the report.
  const free = report.x - (task.x + task.w) - cardW;
  const cardX = task.x + task.w + free * 0.54;
  const step = clamp((height - 2 * pad) / n, CARD.h + 8, 62);
  const top = height / 2 - (step * n) / 2;
  const origin = { x: task.x + task.w, y: height / 2 };
  const barX = report.x + ROW_TEXT + longest(ROLES.map(({ short }) => short)) * MONO_ADVANCE + 12;
  return {
    flow: "row",
    width,
    height,
    task,
    caption: { x: task.x + INSET, y: task.y + 23 },
    title: { x: task.x + INSET, y: task.y + 43 },
    origin,
    agentMark: 18,
    report,
    agents: ROLES.map((role, i) => {
      const mid = top + step * (i + 0.5);
      const parts = card(cardX, cardW, mid);
      const { row, bar } = reportRow(report, REPORT.head, REPORT.row, i, barX);
      return {
        ...role,
        ...parts,
        trail: { kind: "sweep", from: origin, to: parts.at },
        finding: { kind: "sweep", from: { x: cardX + cardW, y: mid }, to: { x: report.x, y: row.y + row.h / 2 } },
        row,
        bar,
      };
    }),
  };
}

/**
 * Top to bottom, for phones: the task, a list of agents, then the report. The
 * jobs branch off a trunk at the left and the results merge into one at the right.
 */
function columnLayout(width: number, height: number): SwarmLayout {
  const pad = 12;
  const roles = ROLES.filter(({ short }) => COMPACT.includes(short));
  const n = roles.length;
  const w = Math.min(width - 2 * pad, 420);
  const x = (width - w) / 2;
  const trunk = 18;
  const reportH = COMPACT_REPORT.head + n * COMPACT_REPORT.row + COMPACT_REPORT.foot;
  const taskH = 36;
  // Spare height goes to the gaps between agents and the bands either side of them, up to a limit.
  const free = Math.max(0, height - (2 * pad + taskH + n * CARD.h + reportH));
  const gap = clamp(free * 0.1, 6, 14);
  const band = clamp((free - (n - 1) * gap) / 2, 0, 52);
  const stack = taskH + band + n * CARD.h + (n - 1) * gap + band + reportH;
  const task = { x, y: Math.max(pad, (height - stack) / 2), w, h: taskH };
  const top = task.y + taskH + band;
  const report = { x, y: top + n * CARD.h + (n - 1) * gap + band, w, h: reportH };
  const origin = { x: x + trunk, y: task.y + taskH };
  const inlet = { x: x + w - trunk, y: report.y };
  const cardX = x + 2 * trunk;
  const cardW = w - 4 * trunk;
  const barX = report.x + ROW_TEXT + longest(roles.map(({ short }) => short)) * MONO_ADVANCE + 12;
  return {
    flow: "column",
    width,
    height,
    task,
    caption: { x: x + 12, y: task.y + 23 },
    title: { x: x + 56, y: task.y + 23 },
    origin,
    agentMark: 18,
    report,
    agents: roles.map((role, i) => {
      const mid = top + CARD.h / 2 + i * (CARD.h + gap);
      const parts = card(cardX, cardW, mid);
      const { row, bar } = reportRow(report, COMPACT_REPORT.head, COMPACT_REPORT.row, i, barX);
      return {
        ...role,
        ...parts,
        trail: { kind: "elbow", from: origin, corner: { x: origin.x, y: parts.at.y }, to: parts.at },
        finding: { kind: "elbow", from: { x: cardX + cardW, y: mid }, corner: { x: inlet.x, y: mid }, to: inlet },
        row,
        bar,
      };
    }),
  };
}

export function swarmLayout(width: number, height: number): SwarmLayout {
  return width >= ROW_MIN_WIDTH ? rowLayout(width, height) : columnLayout(width, height);
}

export const STAGES = ["split", "execute", "combine"] as const;
export type Stage = (typeof STAGES)[number];
/** Where each stage draws in scroll progress, in order; the gaps hold a finished stage on screen. */
const SPANS: Record<Stage, [number, number]> = {
  split: [0.04, 0.3],
  execute: [0.36, 0.62],
  combine: [0.68, 0.94],
};
/** Share of the split and combine stages one agent's step takes; the rest staggers the starts. */
const STEP = 0.5;

function fillOf(stage: Stage, p: number) {
  const [a, b] = SPANS[stage];
  return clamp01((p - a) / (b - a));
}

/** One agent's turn within a stage that takes the agents one after another. */
function turnOf(fill: number, i: number, n: number) {
  const start = (1 - STEP) * (n > 1 ? i / (n - 1) : 0);
  return clamp01((fill - start) / STEP);
}

/** In the execute stage every agent starts at once and takes longer the more it finds. */
function jobOf(fill: number, i: number, n: number, weight: number) {
  const start = 0.06 * (n > 1 ? i / (n - 1) : 0);
  return clamp01((fill - start) / (0.4 + 0.54 * weight));
}

export type AgentFrame = Point & {
  /** The agent's mark, which grows as it leaves the task. */
  scale: number;
  opacity: number;
  /** 0–1: how much of the agent's trail is drawn, its card shown, and its job done. */
  trail: number;
  card: number;
  work: number;
  /** 0–1: how much of the path to the report is drawn. */
  finding: number;
  /** The result on its way to the report. */
  signal: Point & { opacity: number };
  /** 0–1: the agent's report row filled in. */
  reported: number;
};

/** "active" is the stage in progress; "done" once its drawing has finished. */
export type StageState = "next" | "active" | "done";

export type SwarmFrame = {
  /** 0–1: the point on the task the trails leave from. */
  hub: number;
  agents: AgentFrame[];
  /** 0–1: the shared report panel shown. */
  report: number;
  /** Agents whose results have reached the report. */
  landed: number;
  /** Each stage's drawing, 0–1, and its state for the stage legend. */
  stages: Record<Stage, { fill: number; state: StageState }>;
};

export function swarmFrame(layout: SwarmLayout, progress: number): SwarmFrame {
  const p = clamp01(progress);
  const n = layout.agents.length;
  const fill = { split: fillOf("split", p), execute: fillOf("execute", p), combine: fillOf("combine", p) };
  const current = STAGES.find((stage) => fill[stage] < 1);
  const stages = Object.fromEntries(
    STAGES.map((stage) => [stage, { fill: fill[stage], state: fill[stage] >= 1 ? "done" : stage === current ? "active" : "next" }]),
  ) as SwarmFrame["stages"];
  const agents = layout.agents.map((agent, i): AgentFrame => {
    const out = smooth(turnOf(fill.split, i, n));
    const travel = turnOf(fill.combine, i, n);
    const finding = smooth(travel);
    const at = pointOn(agent.trail, out);
    const signal = pointOn(agent.finding, finding);
    return {
      x: at.x,
      y: at.y,
      scale: 0.5 + 0.5 * out,
      opacity: clamp01(out * 4),
      trail: out,
      card: smooth((out - 0.72) / 0.28),
      work: smooth(jobOf(fill.execute, i, n, agent.weight)),
      finding,
      signal: { ...signal, opacity: Math.min(1, travel * 8, (1 - travel) * 8) },
      reported: smooth((travel - 0.82) / 0.18),
    };
  });
  return {
    hub: smooth(fill.split * 6),
    agents,
    report: smooth(fill.combine / 0.12),
    landed: agents.filter((agent) => agent.reported >= 0.5).length,
    stages,
  };
}

/**
 * Progress through the pinned figure: 0 when it pins under the header, 1 when
 * it lets go. A pin with no spare track (short viewports) plays while its top
 * crosses the viewport instead.
 */
export function pinProgress(track: { top: number; height: number }, pin: { top: number; height: number }, viewport: number) {
  const travel = track.height - pin.height;
  if (travel > 1) return clamp01((pin.top - track.top) / travel);
  const start = viewport * 0.8;
  return clamp01((start - track.top) / Math.max(1, start - pin.top));
}
