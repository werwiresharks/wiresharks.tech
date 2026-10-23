import type { Finding } from "./findings.ts";

/**
 * A unit of delegated investigation.
 *
 * The orchestrator breaks a security-assessment objective into tasks, assigns
 * each to a worker capability, and tracks it through a small state machine. A
 * task is a description and a status record — it carries no ability to act. A
 * worker is what runs it, and a worker can only read files the Scope has already
 * cleared. Keeping the task inert is deliberate: delegation never widens
 * authority, it only parcels out work inside the boundary the operator set.
 */
export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface Task {
  /** Stable identity, unique within one assessment. */
  id: string;
  /** The worker capability this task needs, e.g. "source-vulnerability". */
  capability: string;
  /** A short human label, for narration and the report. */
  title: string;
}

export interface TaskRecord {
  task: Task;
  status: TaskStatus;
  /** The worker's findings, once it has run; empty until then. */
  findings: Finding[];
  /** The worker's notes, once it has run. */
  notes: string[];
  /** Why the task did not complete, when status is "failed" or "cancelled". */
  error: string | null;
  /** Milliseconds the worker ran, or null if it never started. */
  durationMs: number | null;
}

/** Terminal states — a task in one of these will not change again. */
export const TERMINAL: readonly TaskStatus[] = ["completed", "failed", "cancelled"];

export const isTerminal = (status: TaskStatus): boolean => TERMINAL.includes(status);
