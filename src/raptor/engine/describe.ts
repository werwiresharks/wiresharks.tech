import type { RaptorEvent } from "./events.ts";
import { childrenOf, liveActions, rootAgent } from "./model.ts";
import type { RaptorModel } from "./model.ts";

/** Plain-language descriptions for screen readers and the event log. */

const STATE_WORDS: Record<string, string> = {
  idle: "idle",
  proposing: "proposing",
  running: "running",
  awaiting: "awaiting authority",
  completed: "completed",
  failed: "failed",
};

const ACTIVITY_WORDS: Record<string, string> = {
  listening: "listening",
  working: "working",
  searching: "searching",
  solving: "solving",
  composing: "composing",
  shaping: "shaping",
};

const TRANSFER_NOUNS: Record<string, string> = {
  brief: "A brief",
  result: "A result",
  steer: "A steer",
  peer: "A message",
};

export function describeModel(model: RaptorModel): string {
  const root = rootAgent(model);
  if (!root) return "No agent is active.";
  if (model.rollback) return "Rolling back to the last checkpoint.";
  const parts = [`Primary agent ${STATE_WORDS[root.state]}`];
  const kids = childrenOf(model, root.id);
  if (kids.length)
    parts.push(
      `${kids.length} parallel subagent${kids.length === 1 ? "" : "s"}`,
    );
  if (root.generation > 1) parts.push(`generation ${root.generation}`);
  const actions = liveActions(model);
  const waiting = actions.filter((a) => a.state === "awaiting").length;
  const executing = actions.filter((a) => a.state === "executing").length;
  if (waiting)
    parts.push(
      `${waiting} action${waiting === 1 ? "" : "s"} held at the authority boundary`,
    );
  if (executing) parts.push(`${executing} authorized action executing`);
  if (model.mode === "conversation") parts.push("in conversation");
  return parts.join(", ") + ".";
}

export function describeEvent(event: RaptorEvent, model: RaptorModel): string {
  const label = (id: string) => model.agents[id]?.label ?? id;
  switch (event.type) {
    case "session.reset":
      return "Session reset";
    case "conversation.opened":
      return "Conversation opened";
    case "conversation.closed":
      return "Conversation closed";
    case "agent.spawned":
      return event.parentId
        ? `${event.label} spawned in parallel`
        : `${event.label} started`;
    case "agent.handoff":
      return `${label(event.fromAgentId)} handed off to ${event.label}`;
    case "agent.state":
      return `${label(event.agentId)} ${STATE_WORDS[event.state]}`;
    case "agent.activity":
      return `${label(event.agentId)} is ${ACTIVITY_WORDS[event.activity]}`;
    case "transfer": {
      const noun = event.label ? `A ${event.label}` : TRANSFER_NOUNS[event.kind];
      const verb = event.disposition === "queued" ? "is queued" : "moved";
      return `${noun} ${verb} from ${label(event.fromAgentId)} to ${label(event.toAgentId)}`;
    }
    case "agent.reintegrated":
      return `${event.agentId} reintegrated`;
    case "action.proposed":
      return `${label(event.agentId)} proposed: ${event.summary}`;
    case "authorization.requested":
      return `${event.actionId} awaiting authority`;
    case "authorization.resolved":
      return `${event.actionId} ${event.decision} by ${event.authority}`;
    case "action.executing":
      return `${event.actionId} executing`;
    case "action.completed":
      return `${event.actionId} completed`;
    case "action.failed":
      return `${event.actionId} failed`;
    case "checkpoint.created":
      return `Checkpoint ${event.checkpointId} saved`;
    case "rollback.started":
      return `Rolling back to ${event.checkpointId}`;
    case "rollback.completed":
      return `Restored ${event.checkpointId}`;
  }
}
