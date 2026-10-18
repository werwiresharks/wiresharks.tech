/**
 * Geometry and timing for the homepage swarm figure: one Raptor mark splits
 * into agents, each agent takes one part of a system, and their findings flow
 * into one shared report as scroll progress runs 0 → 1. Pure, so the figure
 * can be tested without a DOM. Coordinates are CSS pixels in the figure's box.
 */

export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
/** A cubic Bézier: start, two controls, end. */
export type Curve = [Point, Point, Point, Point];

/** Parts of the system under review, one per agent, with each report row's illustrative fill. */
const PARTS = [
  { part: "auth", weight: 0.64 },
  { part: "api", weight: 0.88 },
  { part: "deps", weight: 0.52 },
  { part: "storage", weight: 0.36 },
  { part: "ci/cd", weight: 0.44 },
  { part: "infra", weight: 0.7 },
];
/** Narrow boxes show four parts. */
const COMPACT = ["auth", "api", "deps", "infra"];

/** Boxes narrower than this stack the figure top to bottom. */
export const ROW_MIN_WIDTH = 560;

export type SwarmAgent = {
  part: string;
  weight: number;
  /** Where the agent settles after the split. */
  at: Point;
  /** The path out of the starting mark; drawn behind the agent as it travels. */
  trail: Curve;
  /** The part of the system it examines. */
  node: Rect;
  link: [Point, Point];
  /** The path its findings take from the part to the shared report. */
  finding: Curve;
  /** The report row its findings fill. */
  row: Rect;
};

export type SwarmLayout = {
  /** "row" runs left to right; "column" runs top to bottom. */
  flow: "row" | "column";
  width: number;
  height: number;
  origin: Point;
  /** Side of the starting mark and of each agent's mark. */
  mark: number;
  agentMark: number;
  /** Captions: the mark's moves to its hub as the mark splits. */
  labels: Record<"mark" | "hub" | "system", Point & { anchor: "middle" | "start" }>;
  system: Rect;
  report: Rect;
  agents: SwarmAgent[];
};

/** Report panel rhythm: header, one row per agent, bottom padding. */
const REPORT = { head: 44, row: 26, foot: 12 };
const COMPACT_REPORT = { head: 38, row: 22, foot: 8 };
/** Space above the first part for the system frame's label. */
const SYSTEM_HEAD = 30;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const clamp01 = (v: number) => clamp(v, 0, 1);
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

/** A connector that leaves `a` and arrives at `b` along the flow axis. */
function connector(a: Point, b: Point, flow: SwarmLayout["flow"]): Curve {
  if (flow === "row") {
    const m = (a.x + b.x) / 2;
    return [a, { x: m, y: a.y }, { x: m, y: b.y }, b];
  }
  const m = (a.y + b.y) / 2;
  return [a, { x: a.x, y: m }, { x: b.x, y: m }, b];
}

function pointOn([a, b, c, d]: Curve, t: number): Point {
  const u = 1 - t;
  const k0 = u * u * u;
  const k1 = 3 * u * u * t;
  const k2 = 3 * u * t * t;
  const k3 = t * t * t;
  return { x: k0 * a.x + k1 * b.x + k2 * c.x + k3 * d.x, y: k0 * a.y + k1 * b.y + k2 * c.y + k3 * d.y };
}

/** Left to right: the mark, the agents, the system's parts in a column, then the report. */
function rowLayout(width: number, height: number): SwarmLayout {
  const pad = 20;
  const mark = 56;
  const agentMark = 24;
  const node = { w: 100, h: 32 };
  const reportW = clamp(width * 0.28, 184, 280);
  const reportX = width - pad - reportW;
  const nodeX = reportX - clamp(width * 0.12, 56, 136) - node.w;
  const system = { x: nodeX - 18, y: pad, w: node.w + 36, h: height - 2 * pad };
  const origin = { x: pad + 4 + mark / 2, y: height / 2 };
  const agentX = origin.x + (system.x - origin.x) * 0.56;
  const top = system.y + SYSTEM_HEAD;
  const step = (system.y + system.h - 6 - top) / PARTS.length;
  const reportH = REPORT.head + PARTS.length * REPORT.row + REPORT.foot;
  const report = { x: reportX, y: (height - reportH) / 2, w: reportW, h: reportH };
  return {
    flow: "row",
    width,
    height,
    origin,
    mark,
    agentMark,
    labels: {
      mark: { x: origin.x, y: origin.y + mark / 2 + 20, anchor: "middle" },
      hub: { x: origin.x, y: origin.y + 22, anchor: "middle" },
      system: { x: system.x + 12, y: system.y + 19, anchor: "start" },
    },
    system,
    report,
    agents: PARTS.map(({ part, weight }, i) => {
      const y = top + step * (i + 0.5);
      const at = { x: agentX, y };
      const row = { x: report.x, y: report.y + REPORT.head + i * REPORT.row, w: report.w, h: REPORT.row };
      return {
        part,
        weight,
        at,
        trail: connector(origin, at, "row"),
        node: { x: nodeX, y: y - node.h / 2, ...node },
        link: [{ x: agentX + agentMark / 2 + 8, y }, { x: nodeX, y }],
        finding: connector({ x: nodeX + node.w, y }, { x: report.x, y: row.y + row.h / 2 }, "row"),
        row,
      };
    }),
  };
}

/** Top to bottom, for phones: the mark, a row of agents over a row of parts, then the report. */
function columnLayout(width: number, height: number): SwarmLayout {
  const pad = 12;
  const parts = PARTS.filter(({ part }) => COMPACT.includes(part));
  const n = parts.length;
  const mark = clamp(height * 0.09, 36, 48);
  const agentMark = 20;
  const cell = (width - 2 * pad - 16) / n;
  const node = { w: Math.min(76, cell - 8), h: 28 };
  const systemH = SYSTEM_HEAD + node.h + 12;
  const reportH = COMPACT_REPORT.head + n * COMPACT_REPORT.row + COMPACT_REPORT.foot;
  // Whatever height is left goes to the three connector bands, the findings' band widest.
  const free = Math.max(0, height - (2 * pad + mark + agentMark + systemH + reportH));
  const origin = { x: width / 2, y: pad + mark / 2 };
  const agentY = pad + mark + free * 0.34 + agentMark / 2;
  const system = { x: pad, y: agentY + agentMark / 2 + free * 0.24, w: width - 2 * pad, h: systemH };
  const nodeY = system.y + SYSTEM_HEAD;
  const report = { x: pad, y: height - pad - reportH, w: width - 2 * pad, h: reportH };
  const inlet = { x: report.x + report.w / 2, y: report.y };
  return {
    flow: "column",
    width,
    height,
    origin,
    mark,
    agentMark,
    // The system caption sits between the two middle links, which never run through it.
    labels: {
      mark: { x: origin.x + mark / 2 + 10, y: origin.y + 4, anchor: "start" },
      hub: { x: origin.x + 12, y: origin.y + 4, anchor: "start" },
      system: { x: width / 2, y: system.y + 19, anchor: "middle" },
    },
    system,
    report,
    agents: parts.map(({ part, weight }, i) => {
      const x = pad + 8 + cell * (i + 0.5);
      const at = { x, y: agentY };
      return {
        part,
        weight,
        at,
        trail: connector(origin, at, "column"),
        node: { x: x - node.w / 2, y: nodeY, ...node },
        link: [{ x, y: agentY + agentMark / 2 + 6 }, { x, y: nodeY }],
        finding: connector({ x, y: nodeY + node.h }, inlet, "column"),
        row: { x: report.x, y: report.y + COMPACT_REPORT.head + i * COMPACT_REPORT.row, w: report.w, h: COMPACT_REPORT.row },
      };
    }),
  };
}

export function swarmLayout(width: number, height: number): SwarmLayout {
  return width >= ROW_MIN_WIDTH ? rowLayout(width, height) : columnLayout(width, height);
}

/** Each phase's share of scroll progress. Agents start their own step of a phase in turn. */
const PHASES = {
  split: [0.06, 0.36],
  examine: [0.3, 0.6],
  report: [0.56, 0.92],
} as const;
export type Phase = keyof typeof PHASES;
/** Share of a phase one agent's step takes; the rest of it staggers the starts. */
const STEP = 0.5;

function phaseOf(phase: Phase, p: number) {
  const [a, b] = PHASES[phase];
  return clamp01((p - a) / (b - a));
}

function stepOf(phase: Phase, i: number, n: number, p: number) {
  const [a, b] = PHASES[phase];
  const length = (b - a) * STEP;
  const start = a + (b - a - length) * (n > 1 ? i / (n - 1) : 0);
  return clamp01((p - start) / length);
}

export type AgentFrame = Point & {
  /** 1 is the agent's settled size; it leaves the starting mark at that mark's size. */
  scale: number;
  opacity: number;
  /** 0–1: how much of each path is drawn. */
  trail: number;
  link: number;
  finding: number;
  /** The finding signal on its way to the report. */
  signal: Point & { opacity: number };
  /** 0–1: the agent's report row filled in. */
  reported: number;
};

export type SwarmFrame = {
  /** The starting mark, which fades out as it splits. */
  mark: { scale: number; opacity: number };
  /** 0–1: the hub the agents trail back to, shown as the mark splits. */
  hub: number;
  agents: AgentFrame[];
  /** 0–1: the shared report panel shown. */
  report: number;
  /** Agents whose findings have reached the report. */
  landed: number;
  /** 0–1 through each phase, for the step legend. */
  phases: Record<Phase, number>;
};

export function swarmFrame(layout: SwarmLayout, progress: number): SwarmFrame {
  const p = clamp01(progress);
  const n = layout.agents.length;
  const phases = { split: phaseOf("split", p), examine: phaseOf("examine", p), report: phaseOf("report", p) };
  const grow = layout.mark / layout.agentMark;
  const agents = layout.agents.map((agent, i): AgentFrame => {
    const out = smooth(stepOf("split", i, n, p));
    const travel = stepOf("report", i, n, p);
    const finding = smooth(travel);
    const at = pointOn(agent.trail, out);
    const signal = pointOn(agent.finding, finding);
    return {
      x: at.x,
      y: at.y,
      scale: 1 + (grow - 1) * (1 - out),
      opacity: clamp01(out * 4),
      trail: out,
      link: smooth(stepOf("examine", i, n, p)),
      finding,
      signal: { ...signal, opacity: Math.min(1, travel * 8, (1 - travel) * 8) },
      reported: smooth((travel - 0.82) / 0.18),
    };
  });
  const fade = smooth(phases.split * 1.4);
  return {
    mark: { scale: 1 - 0.3 * smooth(phases.split), opacity: 1 - fade },
    hub: fade,
    agents,
    report: smooth((p - 0.48) / 0.1),
    landed: agents.filter((agent) => agent.reported >= 0.5).length,
    phases,
  };
}

/**
 * Progress through the pinned stage: 0 when it pins under the header, 1 when
 * it lets go. A stage with no spare track to pin in (short viewports) plays
 * while its top crosses the viewport instead.
 */
export function stageProgress(track: { top: number; height: number }, pin: { top: number; height: number }, viewport: number) {
  const travel = track.height - pin.height;
  if (travel > 1) return clamp01((pin.top - track.top) / travel);
  const start = viewport * 0.8;
  return clamp01((start - track.top) / Math.max(1, start - pin.top));
}
