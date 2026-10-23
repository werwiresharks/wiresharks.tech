import type {
  ActionState,
  Activity,
  AgentState,
  RaptorEvent,
  TransferKind,
} from "./events.ts";

/**
 * The engine's view of a Raptor session: an agent hierarchy, pending actions,
 * and the latest checkpoint. Updated only by `reduce`, which validates every
 * event so out-of-order or impossible input never reaches the renderer.
 */

export type AgentNode = {
  id: string;
  label: string;
  /** Parallel parent; null for the primary lineage. */
  parentId: string | null;
  /** Sequential predecessor this agent inherited work from. */
  predecessorId: string | null;
  successorId: string | null;
  state: AgentState;
  activity: Activity;
  /** Retired agents have handed off; they remain as lineage traces. */
  retired: boolean;
  generation: number;
  spawnedSeq: number;
};

export type ActionNode = {
  id: string;
  agentId: string;
  summary: string;
  state: ActionState;
  authority: string | null;
};

export type TransferRecord = {
  id: string;
  kind: TransferKind;
  from: string;
  to: string;
  disposition: "queued" | "delivered";
  bytes: number | null;
  label: string | null;
  seq: number;
};

/** Recent transfers kept for views that animate them; ids are remembered longer, to reject replays. */
const RECENT_TRANSFERS = 32;
const REMEMBERED_TRANSFERS = 512;

export type Checkpoint = {
  id: string;
  seq: number;
  agents: Record<string, AgentNode>;
  order: string[];
};

export type RaptorModel = {
  seq: number;
  /** Presentation semantics survive renderer attachment and skipped updates. */
  sync: { resetSeq: number; hydrate: boolean };
  mode: "focus" | "conversation";
  agents: Record<string, AgentNode>;
  /** Agent ids in spawn order; stable layout depends on it. */
  order: string[];
  actions: Record<string, ActionNode>;
  checkpoint: Checkpoint | null;
  rollback: { checkpointId: string } | null;
  /** Most recent accepted transfers, oldest first. */
  transfers: TransferRecord[];
  /** Ids of accepted transfers, oldest first, so a replay is not drawn twice. */
  transferIds: string[];
};

export type ReduceResult =
  | { accepted: true; model: RaptorModel }
  | { accepted: false; model: RaptorModel; reason: string };

export function createModel(): RaptorModel {
  return {
    seq: 0,
    sync: { resetSeq: 0, hydrate: false },
    mode: "focus",
    agents: {},
    order: [],
    actions: {},
    checkpoint: null,
    rollback: null,
    transfers: [],
    transferIds: [],
  };
}

const ACTION_TRANSITIONS: Record<ActionState, ActionState[]> = {
  proposed: ["awaiting"],
  awaiting: ["approved", "rejected"],
  approved: ["executing"],
  executing: ["completed", "failed"],
  rejected: [],
  completed: [],
  failed: [],
};

function actionReached(current: ActionState, target: ActionState): boolean {
  return current === target || ACTION_TRANSITIONS[target].some(next => actionReached(current, next));
}

export function isActiveAgent(model: RaptorModel, id: string | null) {
  if (!id) return false;
  const agent = model.agents[id];
  return !!agent && !agent.retired;
}

/** The current head of the primary lineage. */
export function rootAgent(model: RaptorModel): AgentNode | null {
  for (const id of model.order) {
    const agent = model.agents[id];
    if (agent.parentId === null && !agent.retired) return agent;
  }
  return null;
}

export function childrenOf(model: RaptorModel, parentId: string) {
  return model.order
    .map((id) => model.agents[id])
    .filter((agent) => agent.parentId === parentId && !agent.retired);
}

/** Actions that still hold particles away from their agent. */
export function liveActions(model: RaptorModel) {
  return Object.values(model.actions).filter(
    (action) =>
      action.state !== "rejected" &&
      action.state !== "completed" &&
      action.state !== "failed",
  );
}

function reject(model: RaptorModel, reason: string): ReduceResult {
  return { accepted: false, model, reason };
}

function withAgent(
  model: RaptorModel,
  id: string,
  patch: Partial<AgentNode>,
): Record<string, AgentNode> {
  return { ...model.agents, [id]: { ...model.agents[id], ...patch } };
}

function cloneAgents(agents: Record<string, AgentNode>) {
  const copy: Record<string, AgentNode> = {};
  for (const id in agents) copy[id] = { ...agents[id] };
  return copy;
}

export function reduce(model: RaptorModel, event: RaptorEvent): ReduceResult {
  if (!Number.isFinite(event.seq) || event.seq <= model.seq)
    return reject(model, `stale sequence ${event.seq} after ${model.seq}`);
  if (
    model.rollback &&
    event.type !== "rollback.completed" &&
    event.type !== "session.reset"
  )
    return reject(model, "rollback in progress");
  const next = (patch: Partial<RaptorModel>): ReduceResult => ({
    accepted: true,
    model: {
      ...model,
      ...patch,
      seq: event.seq,
      sync: {
        resetSeq: event.type === "session.reset" ? event.seq : model.sync.resetSeq,
        hydrate: event.hydrate === true,
      },
    },
  });

  switch (event.type) {
    case "session.reset":
      return next({ ...createModel() });

    case "conversation.opened":
      return model.mode === "conversation" && !event.hydrate
        ? reject(model, "conversation already open")
        : next({ mode: "conversation" });

    case "conversation.closed":
      return model.mode === "focus"
        ? reject(model, "conversation not open")
        : next({ mode: "focus" });

    case "agent.spawned": {
      const existing = model.agents[event.agentId];
      if (existing) {
        if (!event.hydrate || existing.retired || existing.parentId !== event.parentId)
          return reject(model, `agent ${event.agentId} exists`);
        return next({ agents: withAgent(model, event.agentId, { label: event.label }) });
      }
      if (event.parentId === null) {
        if (rootAgent(model)) return reject(model, "primary agent exists");
      } else if (!isActiveAgent(model, event.parentId)) {
        return reject(model, `parent ${event.parentId} is not active`);
      }
      const parent = event.parentId ? model.agents[event.parentId] : null;
      const agent: AgentNode = {
        id: event.agentId,
        label: event.label,
        parentId: event.parentId,
        predecessorId: null,
        successorId: null,
        state: "idle",
        activity: "listening",
        retired: false,
        generation: parent ? parent.generation : 1,
        spawnedSeq: event.seq,
      };
      return next({
        agents: { ...model.agents, [agent.id]: agent },
        order: [...model.order, agent.id],
      });
    }

    case "agent.handoff": {
      if (!isActiveAgent(model, event.fromAgentId))
        return reject(model, `agent ${event.fromAgentId} is not active`);
      if (model.agents[event.toAgentId])
        return reject(model, `agent ${event.toAgentId} exists`);
      const from = model.agents[event.fromAgentId];
      const successor: AgentNode = {
        id: event.toAgentId,
        label: event.label,
        parentId: from.parentId,
        predecessorId: from.id,
        successorId: null,
        state: "running",
        activity: from.activity,
        retired: false,
        generation: from.generation + 1,
        spawnedSeq: event.seq,
      };
      const agents = withAgent(model, from.id, {
        retired: true,
        successorId: successor.id,
        state: "completed",
      });
      agents[successor.id] = successor;
      // Subagents and pending actions follow the work to the successor.
      for (const id in agents)
        if (agents[id].parentId === from.id && !agents[id].retired)
          agents[id] = { ...agents[id], parentId: successor.id };
      const actions = { ...model.actions };
      for (const id in actions)
        if (actions[id].agentId === from.id)
          actions[id] = { ...actions[id], agentId: successor.id };
      return next({ agents, actions, order: [...model.order, successor.id] });
    }

    case "agent.state": {
      if (!isActiveAgent(model, event.agentId))
        return reject(model, `agent ${event.agentId} is not active`);
      if (model.agents[event.agentId].state === event.state && !event.hydrate)
        return reject(model, "state unchanged");
      return next({
        agents: withAgent(model, event.agentId, { state: event.state }),
      });
    }

    case "agent.activity": {
      if (!isActiveAgent(model, event.agentId))
        return reject(model, `agent ${event.agentId} is not active`);
      if (model.agents[event.agentId].activity === event.activity && !event.hydrate)
        return reject(model, "activity unchanged");
      return next({
        agents: withAgent(model, event.agentId, { activity: event.activity }),
      });
    }

    case "transfer": {
      if (model.transferIds.includes(event.transferId))
        return reject(model, `transfer ${event.transferId} already seen`);
      if (event.fromAgentId === event.toAgentId)
        return reject(model, "transfer to itself");
      for (const id of [event.fromAgentId, event.toAgentId])
        if (!isActiveAgent(model, id))
          return reject(model, `agent ${id} is not active`);
      const record: TransferRecord = {
        id: event.transferId,
        kind: event.kind,
        from: event.fromAgentId,
        to: event.toAgentId,
        disposition: event.disposition,
        bytes:
          event.bytes !== undefined && Number.isFinite(event.bytes) && event.bytes >= 0
            ? event.bytes
            : null,
        label: event.label ?? null,
        seq: event.seq,
      };
      return next({
        transfers: [...model.transfers, record].slice(-RECENT_TRANSFERS),
        transferIds: [...model.transferIds, record.id].slice(-REMEMBERED_TRANSFERS),
      });
    }

    case "agent.reintegrated": {
      const agent = model.agents[event.agentId];
      if (!agent || agent.retired || !agent.parentId)
        return reject(model, `agent ${event.agentId} cannot reintegrate`);
      const orphans = Object.values(model.agents).some(
        (other) => other.parentId === agent.id && !other.retired,
      );
      if (orphans) return reject(model, "agent still has active subagents");
      const agents = { ...model.agents };
      // Lineage traces of the subagent fold back with it.
      let cursor: string | null = agent.id;
      while (cursor) {
        const node: AgentNode = agents[cursor];
        delete agents[cursor];
        cursor = node.predecessorId;
      }
      const actions = { ...model.actions };
      for (const id in actions)
        if (!agents[actions[id].agentId]) delete actions[id];
      return next({
        agents,
        actions,
        order: model.order.filter((id) => agents[id]),
      });
    }

    case "action.proposed": {
      const existing = model.actions[event.actionId];
      if (existing) {
        if (!event.hydrate || existing.agentId !== event.agentId)
          return reject(model, `action ${event.actionId} exists`);
        return next({ actions: { ...model.actions, [existing.id]: { ...existing, summary: event.summary } } });
      }
      if (!isActiveAgent(model, event.agentId))
        return reject(model, `agent ${event.agentId} is not active`);
      return next({
        actions: {
          ...model.actions,
          [event.actionId]: {
            id: event.actionId,
            agentId: event.agentId,
            summary: event.summary,
            state: "proposed",
            authority: null,
          },
        },
      });
    }

    case "action.withdrawn": {
      if (!model.actions[event.actionId]) return reject(model, `unknown action ${event.actionId}`);
      const actions = { ...model.actions };
      delete actions[event.actionId];
      return next({ actions });
    }

    case "authorization.requested":
    case "authorization.resolved":
    case "action.executing":
    case "action.completed":
    case "action.failed": {
      const action = model.actions[event.actionId];
      if (!action) return reject(model, `unknown action ${event.actionId}`);
      const target: ActionState =
        event.type === "authorization.requested"
          ? "awaiting"
          : event.type === "authorization.resolved"
            ? event.decision
            : event.type === "action.executing"
              ? "executing"
              : event.type === "action.completed"
                ? "completed"
                : "failed";
      if (event.hydrate && actionReached(action.state, target)) {
        if (event.type === "authorization.resolved" && action.authority !== event.authority)
          return reject(model, `action ${action.id}: authority changed`);
        return next({});
      }
      if (!ACTION_TRANSITIONS[action.state].includes(target))
        return reject(model, `action ${action.id}: ${action.state} → ${target}`);
      return next({
        actions: {
          ...model.actions,
          [action.id]: {
            ...action,
            state: target,
            authority:
              event.type === "authorization.resolved"
                ? event.authority
                : action.authority,
          },
        },
      });
    }

    case "checkpoint.created":
      if (!rootAgent(model)) return reject(model, "nothing to checkpoint");
      return next({
        checkpoint: {
          id: event.checkpointId,
          seq: event.seq,
          agents: cloneAgents(model.agents),
          order: [...model.order],
        },
      });

    case "rollback.started":
      if (!model.checkpoint || model.checkpoint.id !== event.checkpointId)
        return reject(model, `unknown checkpoint ${event.checkpointId}`);
      return next({ rollback: { checkpointId: event.checkpointId } });

    case "rollback.completed": {
      if (!model.rollback || model.rollback.checkpointId !== event.checkpointId)
        return reject(model, "no matching rollback in progress");
      const checkpoint = model.checkpoint!;
      const agents = cloneAgents(checkpoint.agents);
      for (const id in agents)
        if (!agents[id].retired) agents[id].state = "idle";
      return next({
        agents,
        order: [...checkpoint.order],
        actions: {},
        rollback: null,
      });
    }
  }
}
