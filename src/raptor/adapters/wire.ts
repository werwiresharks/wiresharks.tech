import type {
  Activity,
  AgentState,
  RaptorEvent,
  RaptorEventType,
  TransferKind,
} from "../engine/events.ts";

/**
 * The boundary between an untrusted transport and the engine.
 *
 * A real Raptor runtime streams JSON over a socket; this turns one decoded
 * message into a validated {@link RaptorEvent} or `null`. It checks the shape
 * of every field so malformed, partial, or hostile input can never reach the
 * reducer. It never throws: a bad message is dropped, not fatal.
 *
 * Semantic validation (ordering, state transitions, hierarchy) stays in the
 * reducer. This layer only guarantees the discriminated union is well formed.
 */

const AGENT_STATES: readonly AgentState[] = [
  "idle",
  "proposing",
  "running",
  "awaiting",
  "completed",
  "failed",
];

const ACTIVITIES: readonly Activity[] = [
  "listening",
  "working",
  "searching",
  "solving",
  "composing",
  "shaping",
];

const TRANSFER_KINDS: readonly TransferKind[] = ["brief", "result", "steer", "peer"];

const oneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (values as readonly string[]).includes(value);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** A finite, non-negative sequence or timestamp. */
function num(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isAgentState(value: unknown): value is AgentState {
  return typeof value === "string" && (AGENT_STATES as readonly string[]).includes(value);
}

/**
 * Per-type field validators. Each returns the event-specific fields (without
 * `seq`/`at`, which the envelope supplies) or `null` if the payload is unfit.
 * Keyed by every {@link RaptorEventType}, so a new event type that lacks a
 * validator fails type-checking here rather than silently passing.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;
type Body = DistributiveOmit<RaptorEvent, "seq" | "at">;

const BODIES: {
  [T in RaptorEventType]: (
    m: Record<string, unknown>,
  ) => Extract<Body, { type: T }> | null;
} = {
  "session.reset": () => ({ type: "session.reset" }),
  "conversation.opened": () => ({ type: "conversation.opened" }),
  "conversation.closed": () => ({ type: "conversation.closed" }),
  "agent.spawned": (m) =>
    str(m.agentId) &&
    (m.parentId === null || str(m.parentId)) &&
    str(m.label)
      ? {
          type: "agent.spawned",
          agentId: m.agentId,
          parentId: m.parentId as string | null,
          label: m.label,
        }
      : null,
  "agent.handoff": (m) =>
    str(m.fromAgentId) && str(m.toAgentId) && str(m.label)
      ? {
          type: "agent.handoff",
          fromAgentId: m.fromAgentId,
          toAgentId: m.toAgentId,
          label: m.label,
        }
      : null,
  "agent.state": (m) =>
    str(m.agentId) && isAgentState(m.state)
      ? { type: "agent.state", agentId: m.agentId, state: m.state }
      : null,
  "agent.activity": (m) =>
    str(m.agentId) && oneOf(ACTIVITIES, m.activity)
      ? { type: "agent.activity", agentId: m.agentId, activity: m.activity }
      : null,
  transfer: (m) =>
    str(m.transferId) &&
    oneOf(TRANSFER_KINDS, m.kind) &&
    str(m.fromAgentId) &&
    str(m.toAgentId) &&
    (m.disposition === "queued" || m.disposition === "delivered") &&
    (m.bytes === undefined || (num(m.bytes) && m.bytes >= 0)) &&
    (m.label === undefined || str(m.label))
      ? {
          type: "transfer",
          transferId: m.transferId,
          kind: m.kind,
          fromAgentId: m.fromAgentId,
          toAgentId: m.toAgentId,
          disposition: m.disposition,
          ...(m.bytes === undefined ? {} : { bytes: m.bytes as number }),
          ...(m.label === undefined ? {} : { label: m.label as string }),
        }
      : null,
  "agent.reintegrated": (m) =>
    str(m.agentId) ? { type: "agent.reintegrated", agentId: m.agentId } : null,
  "action.proposed": (m) =>
    str(m.actionId) && str(m.agentId) && str(m.summary)
      ? {
          type: "action.proposed",
          actionId: m.actionId,
          agentId: m.agentId,
          summary: m.summary,
        }
      : null,
  "authorization.requested": (m) =>
    str(m.actionId)
      ? { type: "authorization.requested", actionId: m.actionId }
      : null,
  "authorization.resolved": (m) =>
    str(m.actionId) &&
    (m.decision === "approved" || m.decision === "rejected") &&
    str(m.authority)
      ? {
          type: "authorization.resolved",
          actionId: m.actionId,
          decision: m.decision,
          authority: m.authority,
        }
      : null,
  "action.executing": (m) =>
    str(m.actionId) ? { type: "action.executing", actionId: m.actionId } : null,
  "action.completed": (m) =>
    str(m.actionId) ? { type: "action.completed", actionId: m.actionId } : null,
  "action.withdrawn": (m) =>
    str(m.actionId) ? { type: "action.withdrawn", actionId: m.actionId } : null,
  "action.failed": (m) =>
    str(m.actionId) ? { type: "action.failed", actionId: m.actionId } : null,
  "checkpoint.created": (m) =>
    str(m.checkpointId)
      ? { type: "checkpoint.created", checkpointId: m.checkpointId }
      : null,
  "rollback.started": (m) =>
    str(m.checkpointId)
      ? { type: "rollback.started", checkpointId: m.checkpointId }
      : null,
  "rollback.completed": (m) =>
    str(m.checkpointId)
      ? { type: "rollback.completed", checkpointId: m.checkpointId }
      : null,
};

/**
 * Validate one decoded message. Returns a {@link RaptorEvent} with an integer
 * `seq` and optional `at`, or `null` for anything malformed.
 */
export function parseEvent(raw: unknown): RaptorEvent | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.type !== "string" || !(raw.type in BODIES)) return null;
  if (!num(raw.seq) || !Number.isInteger(raw.seq) || raw.seq < 0) return null;
  if (raw.at !== undefined && !num(raw.at)) return null;
  if (raw.hydrate !== undefined && typeof raw.hydrate !== "boolean") return null;

  const body = BODIES[raw.type as RaptorEventType](raw);
  if (!body) return null;

  const event = { ...body, seq: raw.seq } as RaptorEvent;
  if (raw.at !== undefined) event.at = raw.at as number;
  if (raw.hydrate !== undefined) event.hydrate = raw.hydrate as boolean;
  return event;
}

/**
 * Parse a raw string or decoded value into zero or one events, for use with
 * {@link createMessageSource}. A JSON string is decoded first; a decode error
 * yields no events rather than throwing.
 */
export function parseMessage(message: unknown): RaptorEvent[] {
  let value = message;
  if (typeof message === "string") {
    try {
      value = JSON.parse(message);
    } catch {
      return [];
    }
  }
  const event = parseEvent(value);
  return event ? [event] : [];
}
