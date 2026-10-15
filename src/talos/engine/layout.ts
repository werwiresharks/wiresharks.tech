import type { TalosEvent } from "./events.ts";
import { childrenOf, liveActions, rootAgent } from "./model.ts";
import type { AgentNode, TalosModel } from "./model.ts";

/**
 * Pure mapping from a Talos model to spatial targets, in "system units"
 * (the idle primary agent has radius 1, centred on the origin). The renderer
 * owns framing, smoothing, and particles; nothing here touches WebGL.
 */

export type Tone =
  | "idle"
  | "proposing"
  | "running"
  | "awaiting"
  | "completed"
  | "failed"
  | "trace"
  | "action-proposed"
  | "action-awaiting"
  | "action-approved"
  | "action-executing"
  | "rollback";

export type Vec3 = [number, number, number];

export type ClusterTarget = {
  key: string;
  kind: "agent" | "trace" | "action";
  center: Vec3;
  radius: number;
  /** Fraction of all particles this cluster should own. */
  share: number;
  tone: Tone;
  /** Where new particles for this cluster should be drawn from. */
  sourceKey: string | null;
  /** Seconds over which arriving particles are staggered. */
  gather: number;
  /** Squash against a boundary: unit normal in the xy-plane and amount. */
  flatten: { nx: number; ny: number; amount: number } | null;
};

export type ThreadTarget = {
  key: string;
  from: string;
  to: string;
  kind: "hierarchy" | "lineage" | "tether";
};

export type Layout = {
  clusters: ClusterTarget[];
  threads: ThreadTarget[];
  /** The authority boundary encircling every agent. */
  ring: { radius: number; holdAngle: number | null };
  checkpoint: { radius: number; active: boolean } | null;
};

export type Effect =
  | { kind: "bloom"; key: string }
  | { kind: "gate"; angle: number }
  | { kind: "flash"; key: string; strength: number }
  | { kind: "handoff"; threadKey: string };

export const agentKey = (id: string) => `a:${id}`;
export const actionKey = (id: string) => `x:${id}`;

const ROOT_ACTION_ANGLE = (38 * Math.PI) / 180;
const TRACE_ANGLE = (-138 * Math.PI) / 180;
const MAX_TRACES = 3;
const RING_MARGIN = 0.24;
const ACTION_SHARE = 0.035;

function rootRadius(childCount: number) {
  return childCount === 0 ? 1 : childCount > 4 ? 0.6 : 0.66;
}

/** Spread subagents over an arc that leaves room for lineage traces. */
function childAngles(count: number) {
  if (count === 1) return [(20 * Math.PI) / 180];
  const start = (-62 * Math.PI) / 180;
  const end = (168 * Math.PI) / 180;
  return Array.from(
    { length: count },
    (_, i) => start + ((end - start) * i) / (count - 1),
  );
}

type Placed = { center: Vec3; radius: number; angle: number };

function lineage(model: TalosModel, head: AgentNode) {
  const traces: AgentNode[] = [];
  let cursor = head.predecessorId;
  while (cursor && traces.length < MAX_TRACES) {
    const agent = model.agents[cursor];
    if (!agent) break;
    traces.push(agent);
    cursor = agent.predecessorId;
  }
  return traces;
}

export function computeLayout(model: TalosModel): Layout {
  const clusters: ClusterTarget[] = [];
  const threads: ThreadTarget[] = [];
  const placed = new Map<string, Placed>();
  const root = rootAgent(model);
  if (!root)
    return {
      clusters,
      threads,
      ring: { radius: 1 + RING_MARGIN, holdAngle: null },
      checkpoint: null,
    };

  const kids = childrenOf(model, root.id);
  const rootR = rootRadius(kids.length);
  placed.set(root.id, {
    center: [0, 0, 0],
    radius: rootR,
    angle: ROOT_ACTION_ANGLE,
  });
  const rootCluster: ClusterTarget = {
    key: agentKey(root.id),
    kind: "agent",
    center: [0, 0, 0],
    radius: root.state === "failed" ? rootR * 0.8 : rootR,
    share: 0, // remainder, assigned below
    tone: root.state,
    sourceKey: root.predecessorId ? agentKey(root.predecessorId) : null,
    gather: 1.1,
    flatten: null,
  };
  clusters.push(rootCluster);

  const childR = kids.length > 4 ? 0.21 : 0.26;
  const distance = rootR + 0.46;
  childAngles(kids.length).forEach((angle, i) => {
    const child = kids[i];
    const center: Vec3 = [
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      0,
    ];
    placed.set(child.id, { center, radius: childR, angle });
    clusters.push({
      key: agentKey(child.id),
      kind: "agent",
      center,
      radius: child.state === "failed" ? childR * 0.78 : childR,
      share: 0.085,
      tone: child.state,
      sourceKey: child.predecessorId
        ? agentKey(child.predecessorId)
        : agentKey(root.id),
      gather: 0.9,
      flatten: null,
    });
    threads.push({
      key: `h:${child.id}`,
      from: agentKey(root.id),
      to: agentKey(child.id),
      kind: "hierarchy",
    });
    // Grandchildren are drawn as small satellites of their parent.
    childrenOf(model, child.id).forEach((grand, j, all) => {
      const a = angle + (j - (all.length - 1) / 2) * 0.7;
      const c: Vec3 = [
        center[0] + Math.cos(a) * (childR + 0.16),
        center[1] + Math.sin(a) * (childR + 0.16),
        0,
      ];
      placed.set(grand.id, { center: c, radius: 0.09, angle: a });
      clusters.push({
        key: agentKey(grand.id),
        kind: "agent",
        center: c,
        radius: 0.09,
        share: 0.02,
        tone: grand.state,
        sourceKey: agentKey(child.id),
        gather: 0.6,
        flatten: null,
      });
      threads.push({
        key: `h:${grand.id}`,
        from: agentKey(child.id),
        to: agentKey(grand.id),
        kind: "hierarchy",
      });
    });
  });

  // Sequential lineage: retired predecessors stay visible as dim traces.
  for (const head of [root, ...kids]) {
    const at = placed.get(head.id)!;
    const isRoot = head.id === root.id;
    const dirAngle = isRoot ? TRACE_ANGLE : at.angle;
    let previous = head.id;
    lineage(model, head).forEach((trace, i) => {
      const radius = isRoot ? 0.13 - i * 0.025 : 0.07 - i * 0.012;
      const offset = isRoot
        ? at.radius + 0.26 + i * 0.27
        : at.radius + 0.13 + i * 0.15;
      const center: Vec3 = [
        at.center[0] + Math.cos(dirAngle) * offset,
        at.center[1] + Math.sin(dirAngle) * offset,
        0,
      ];
      placed.set(trace.id, { center, radius, angle: dirAngle });
      clusters.push({
        key: agentKey(trace.id),
        kind: "trace",
        center,
        radius,
        share: isRoot ? 0.022 - i * 0.004 : 0.008,
        tone: "trace",
        sourceKey: null,
        gather: 0,
        flatten: null,
      });
      threads.push({
        key: `l:${previous}>${trace.id}`,
        from: agentKey(previous),
        to: agentKey(trace.id),
        kind: "lineage",
      });
      previous = trace.id;
    });
  }

  let ringRadius = 0;
  for (const p of placed.values())
    ringRadius = Math.max(
      ringRadius,
      Math.hypot(p.center[0], p.center[1]) + p.radius,
    );
  ringRadius += RING_MARGIN;

  // Proposed actions travel to the boundary; only authority lets them cross.
  let holdAngle: number | null = null;
  for (const action of liveActions(model)) {
    const owner = placed.get(action.agentId);
    if (!owner) continue;
    const angle = owner.angle;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const ownerReach = Math.hypot(owner.center[0], owner.center[1]);
    let distanceFromCenter = ringRadius + 0.36;
    let radius = 0.13;
    let flatten: ClusterTarget["flatten"] = null;
    let tone: Tone = "action-executing";
    if (action.state === "proposed") {
      distanceFromCenter = ownerReach + owner.radius + 0.08;
      radius = 0.1;
      tone = "action-proposed";
    } else if (action.state === "awaiting") {
      distanceFromCenter = ringRadius - 0.06;
      radius = 0.17;
      flatten = { nx, ny, amount: 0.8 };
      tone = "action-awaiting";
      holdAngle = angle;
    } else if (action.state === "approved") {
      tone = "action-approved";
    }
    clusters.push({
      key: actionKey(action.id),
      kind: "action",
      center: [nx * distanceFromCenter, ny * distanceFromCenter, 0.05],
      radius,
      share: ACTION_SHARE,
      tone,
      sourceKey: agentKey(action.agentId),
      gather: 0.45,
      flatten,
    });
    threads.push({
      key: `t:${action.id}`,
      from: agentKey(action.agentId),
      to: actionKey(action.id),
      kind: "tether",
    });
  }

  // The primary agent owns every particle not claimed elsewhere.
  const claimed = clusters.reduce((sum, c) => sum + c.share, 0);
  const scale = claimed > 0.62 ? 0.62 / claimed : 1;
  for (const cluster of clusters) cluster.share *= scale;
  rootCluster.share = 1 - claimed * scale;

  let checkpoint: Layout["checkpoint"] = null;
  if (model.checkpoint) {
    const agents = Object.values(model.checkpoint.agents);
    const snapshotRoot = agents.find(
      (agent) => agent.parentId === null && !agent.retired,
    );
    const snapshotKids = snapshotRoot
      ? agents.filter(
          (agent) => agent.parentId === snapshotRoot.id && !agent.retired,
        ).length
      : 0;
    checkpoint = {
      radius: rootRadius(snapshotKids) * 1.07,
      active: !!model.rollback,
    };
  }

  // During rollback, everything returns toward the checkpoint representation.
  if (model.rollback && checkpoint) {
    for (const cluster of clusters) {
      cluster.center = [0, 0, 0];
      cluster.radius =
        cluster === rootCluster
          ? checkpoint.radius * 0.93
          : checkpoint.radius * 0.45;
      cluster.tone = "rollback";
      cluster.flatten = null;
    }
  }

  return {
    clusters,
    threads,
    ring: { radius: ringRadius, holdAngle },
    checkpoint,
  };
}

/** One-shot visual effects implied by an accepted event. */
export function deriveEffects(
  prev: TalosModel,
  next: TalosModel,
  event: TalosEvent,
): Effect[] {
  switch (event.type) {
    case "authorization.resolved": {
      if (event.decision !== "approved") return [];
      const holdAngle = computeLayout(prev).ring.holdAngle;
      const effects: Effect[] = [
        { kind: "bloom", key: actionKey(event.actionId) },
      ];
      if (holdAngle !== null) effects.push({ kind: "gate", angle: holdAngle });
      return effects;
    }
    case "action.completed": {
      const action = next.actions[event.actionId];
      return action
        ? [{ kind: "flash", key: agentKey(action.agentId), strength: 0.6 }]
        : [];
    }
    case "agent.state":
      return event.state === "completed"
        ? [{ kind: "flash", key: agentKey(event.agentId), strength: 1 }]
        : [];
    case "agent.handoff":
      return [
        {
          kind: "handoff",
          threadKey: `l:${event.toAgentId}>${event.fromAgentId}`,
        },
      ];
    case "rollback.completed": {
      const root = rootAgent(next);
      return root
        ? [{ kind: "flash", key: agentKey(root.id), strength: 0.35 }]
        : [];
    }
    default:
      return [];
  }
}
