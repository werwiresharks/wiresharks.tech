import type { ActionState, AgentState, TalosEvent } from "./events.ts";

/**
 * The engine's view of a Talos session: an agent hierarchy, pending actions,
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

export type Checkpoint = {
  id: string;
  seq: number;
  agents: Record<string, AgentNode>;
  order: string[];
};

export type TalosModel = {
  seq: number;
  mode: "focus" | "conversation";
  agents: Record<string, AgentNode>;
  /** Agent ids in spawn order; stable layout depends on it. */
  order: string[];
  actions: Record<string, ActionNode>;
  checkpoint: Checkpoint | null;
  rollback: { checkpointId: string } | null;
};

export type ReduceResult =
  | { accepted: true; model: TalosModel }
  | { accepted: false; model: TalosModel; reason: string };

export function createModel(): TalosModel {
  return {
    seq: 0,
    mode: "focus",
    agents: {},
    order: [],
    actions: {},
    checkpoint: null,
    rollback: null,
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

export function isActiveAgent(model: TalosModel, id: string | null) {
  if (!id) return false;
  const agent = model.agents[id];
  return !!agent && !agent.retired;
}

/** The current head of the primary lineage. */
export function rootAgent(model: TalosModel): AgentNode | null {
  for (const id of model.order) {
    const agent = model.agents[id];
    if (agent.parentId === null && !agent.retired) return agent;
  }
  return null;
}

export function childrenOf(model: TalosModel, parentId: string) {
  return model.order
    .map((id) => model.agents[id])
    .filter((agent) => agent.parentId === parentId && !agent.retired);
}

/** Actions that still hold particles away from their agent. */
export function liveActions(model: TalosModel) {
  return Object.values(model.actions).filter(
    (action) =>
      action.state !== "rejected" &&
      action.state !== "completed" &&
      action.state !== "failed",
  );
}

function reject(model: TalosModel, reason: string): ReduceResult {
  return { accepted: false, model, reason };
}

function withAgent(
  model: TalosModel,
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

export function reduce(model: TalosModel, event: TalosEvent): ReduceResult {
  if (!Number.isFinite(event.seq) || event.seq <= model.seq)
    return reject(model, `stale sequence ${event.seq} after ${model.seq}`);
  if (
    model.rollback &&
    event.type !== "rollback.completed" &&
    event.type !== "session.reset"
  )
    return reject(model, "rollback in progress");
  const next = (patch: Partial<TalosModel>): ReduceResult => ({
    accepted: true,
    model: { ...model, ...patch, seq: event.seq },
  });

  switch (event.type) {
    case "session.reset":
      return next({ ...createModel() });

    case "conversation.opened":
      return model.mode === "conversation"
        ? reject(model, "conversation already open")
        : next({ mode: "conversation" });

    case "conversation.closed":
      return model.mode === "focus"
        ? reject(model, "conversation not open")
        : next({ mode: "focus" });

    case "agent.spawned": {
      if (model.agents[event.agentId])
        return reject(model, `agent ${event.agentId} exists`);
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
      if (model.agents[event.agentId].state === event.state)
        return reject(model, "state unchanged");
      return next({
        agents: withAgent(model, event.agentId, { state: event.state }),
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
      if (model.actions[event.actionId])
        return reject(model, `action ${event.actionId} exists`);
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
