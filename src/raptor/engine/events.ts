/**
 * Raptor event vocabulary.
 *
 * These are the only inputs the Raptor Particle Engine accepts. A real Raptor
 * runtime supplies them through an adapter (see ../adapters/source.ts); the
 * marketing site supplies simulated ones from ../demo/director.ts.
 *
 * Authorization decisions are *reported* to the engine, never made by it.
 * `authorization.resolved` describes a decision a trusted runtime or policy
 * layer has already enforced. The visualization has no authority of its own.
 */

export type AgentState =
  | "idle"
  | "proposing"
  | "running"
  | "awaiting"
  | "completed"
  | "failed";

/**
 * What an agent is doing, in the particle vocabulary. Independent of its
 * lifecycle state: a running agent may be searching, then solving. Waiting on
 * authority is lifecycle (`awaiting`), never an activity.
 */
export type Activity =
  | "listening"
  | "working"
  | "searching"
  | "solving"
  | "composing"
  | "shaping";

/**
 * Data a runtime reported moving between two agents: a delegation brief down,
 * a result up, a steer, or a message between peers. Never inferred from timing.
 */
export type TransferKind = "brief" | "result" | "steer" | "peer";

export type ActionState =
  | "proposed"
  | "awaiting"
  | "approved"
  | "rejected"
  | "executing"
  | "completed"
  | "failed";

type EventBase = {
  /** Strictly increasing sequence number assigned by the event producer. */
  seq: number;
  /** Producer timestamp in milliseconds, informational only. */
  at?: number;
};

export type RaptorEvent = EventBase &
  (
    | { type: "session.reset" }
    | { type: "conversation.opened" }
    | { type: "conversation.closed" }
    | {
        type: "agent.spawned";
        agentId: string;
        /** null for the primary agent; otherwise the agent that spawned it. */
        parentId: string | null;
        label: string;
      }
    | {
        /** Sequential succession: work and context move to a successor. */
        type: "agent.handoff";
        fromAgentId: string;
        toAgentId: string;
        label: string;
      }
    | { type: "agent.state"; agentId: string; state: AgentState }
    | { type: "agent.activity"; agentId: string; activity: Activity }
    | {
        type: "transfer";
        /** Unique per transfer; a replayed id is rejected. */
        transferId: string;
        kind: TransferKind;
        fromAgentId: string;
        toAgentId: string;
        /** Accepted for delivery (queued) or reported delivered. Never assumed read. */
        disposition: "queued" | "delivered";
        /** Payload size when the runtime reports it; it sets the packet's density. */
        bytes?: number;
        /** A short noun for the payload, e.g. "finding". */
        label?: string;
      }
    | {
        /** A subagent has finished and folds back into its parent. */
        type: "agent.reintegrated";
        agentId: string;
      }
    | {
        type: "action.proposed";
        actionId: string;
        agentId: string;
        summary: string;
      }
    | { type: "authorization.requested"; actionId: string }
    | {
        type: "authorization.resolved";
        actionId: string;
        decision: "approved" | "rejected";
        /** Who decided. Always a runtime or policy layer, never the model. */
        authority: string;
      }
    | { type: "action.executing"; actionId: string }
    | { type: "action.completed"; actionId: string }
    | { type: "action.failed"; actionId: string }
    | { type: "checkpoint.created"; checkpointId: string }
    | { type: "rollback.started"; checkpointId: string }
    | { type: "rollback.completed"; checkpointId: string }
  );

export type RaptorEventType = RaptorEvent["type"];

/** An event without its sequence number, as produced before ordering. */
export type UnsequencedEvent = RaptorEvent extends infer E
  ? E extends RaptorEvent
    ? Omit<E, "seq">
    : never
  : never;
