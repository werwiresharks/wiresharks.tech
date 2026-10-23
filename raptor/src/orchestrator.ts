import { mapRepo, readMapped } from "./map.ts";
import { sortFindings, countByStatus } from "./findings.ts";
import type { Finding } from "./findings.ts";
import type { Scope } from "./scope.ts";
import type { RepoMap } from "./map.ts";
import type { Prover } from "./prove.ts";
import type { Transport } from "./modelReviewer.ts";
import { scopedReader } from "./worker.ts";
import type { InvestigationWorker, WorkerCapability, WorkerContext, WorkerResult, WorkerRegistry } from "./worker.ts";
import { runScheduled } from "./scheduler.ts";
import type { ScheduledJob } from "./scheduler.ts";
import type { Task, TaskRecord } from "./task.ts";
import type { UnsequencedEvent } from "./events.ts";

/**
 * The Raptor orchestrator: the central intelligence of the assessment.
 *
 * It realizes the product figure — split an objective into jobs for specialized
 * workers, run them in parallel, and combine their findings into one report. It
 * maps the authorized repository once, discovers which worker capabilities
 * apply to it, asks a strategy to choose which to dispatch for the objective at
 * hand (deterministic by default, or a model when one is supplied — the
 * reasoning seam), delegates one task per chosen worker to the bounded
 * scheduler, then consolidates every worker's findings, dedupes them, and rules
 * on the merged set with the Prover.
 *
 * It is coordination, not new authority: every worker is read-only and can only
 * touch files the Scope already cleared. The orchestrator writes no files,
 * executes nothing, and reaches nothing outside the Scope.
 */
export interface AssessmentStrategy {
  readonly name: string;
  /** Choose which of the available capabilities to dispatch for this objective. */
  select(input: {
    objective: string | null;
    map: RepoMap;
    available: WorkerCapability[];
  }): string[] | Promise<string[]>;
}

export interface AssessmentOptions {
  scope: Scope;
  registry: WorkerRegistry;
  /** A natural-language objective; shapes which capabilities a strategy picks. */
  objective?: string;
  /** Rules on the consolidated leads. Omit to leave every finding open. */
  prover?: Prover;
  /** Chooses the worker set. Defaults to every applicable worker. */
  strategy?: AssessmentStrategy;
  /** Max workers running at once. Default 4. */
  concurrency?: number;
  /** Per-worker time budget in ms. Omit for none. */
  taskTimeoutMs?: number;
  emit?: (event: UnsequencedEvent) => void;
  /** Cancels the whole assessment; pending workers do not start. */
  signal?: AbortSignal;
}

export interface AssessmentResult {
  root: string;
  objective: string | null;
  strategy: string;
  /** One record per dispatched worker, with its status and timing. */
  tasks: TaskRecord[];
  prover: string | null;
  fileCount: number;
  findings: Finding[];
  notes: string[];
}

const PRIMARY = "raptor";
const PROVE = "prove";

export async function runAssessment(options: AssessmentOptions): Promise<AssessmentResult> {
  const { scope, registry } = options;
  const objective = options.objective?.trim() || null;
  const strategy = options.strategy ?? allApplicableStrategy();
  const emit = options.emit ?? (() => {});

  emit({ type: "session.reset" });
  emit({ type: "conversation.opened" });
  emit({ type: "agent.spawned", agentId: PRIMARY, parentId: null, label: "Raptor" });
  emit({ type: "agent.state", agentId: PRIMARY, state: "running" });

  // Map once, then discover which capabilities apply to this repository.
  const map = await mapRepo(scope);
  const applicable = registry.applicable(map);
  const available: WorkerCapability[] = applicable.map((w) => ({
    capability: w.capability,
    title: w.title,
    description: w.description,
  }));

  // Plan: the strategy reasons over the objective and the available capabilities
  // and returns the ones to dispatch. Unknown or inapplicable picks are dropped.
  const applicableById = new Map(applicable.map((w) => [w.capability, w] as const));
  let chosenIds: string[];
  try {
    chosenIds = await strategy.select({ objective, map, available });
  } catch {
    chosenIds = available.map((c) => c.capability); // a failing strategy still runs the applicable set
  }
  const chosen: InvestigationWorker[] = dedupe(chosenIds)
    .map((id) => applicableById.get(id))
    .filter((w): w is InvestigationWorker => w !== undefined);

  // Delegate: one task per chosen worker, each a parallel engine agent under the
  // orchestrator. Spawn them all first so the swarm is visible at once.
  const tasks: Task[] = chosen.map((w, i) => ({
    id: `task-${i + 1}`,
    capability: w.capability,
    title: w.title,
  }));
  const agentIdFor = (task: Task): string => `w:${task.capability}`;
  for (const task of tasks) {
    emit({ type: "agent.spawned", agentId: agentIdFor(task), parentId: PRIMARY, label: task.title });
  }

  const read = scopedReader(map);
  const jobs: ScheduledJob<WorkerResult>[] = chosen.map((worker, i) => ({
    id: tasks[i].id,
    run: (signal) => {
      emit({ type: "agent.state", agentId: agentIdFor(tasks[i]), state: "running" });
      const ctx: WorkerContext = { scope, map, read, agentId: agentIdFor(tasks[i]), emit, signal };
      return worker.run(ctx);
    },
  }));

  const outcomes = await runScheduled(jobs, {
    concurrency: options.concurrency ?? 4,
    timeoutMs: options.taskTimeoutMs,
    signal: options.signal,
  });

  // Collect each worker's result into a task record and fold the agent back in.
  const records: TaskRecord[] = [];
  const collected: Finding[] = [];
  const notes: string[] = [];
  for (let i = 0; i < outcomes.length; i += 1) {
    const outcome = outcomes[i];
    const task = tasks[i];
    const result = outcome.value;
    const findings = (result?.findings ?? []).map((f) => ({ ...f, source: task.capability }));
    const status = outcome.status === "completed" ? "completed" : outcome.status === "cancelled" ? "cancelled" : "failed";
    records.push({ task, status, findings, notes: result?.notes ?? [], error: outcome.error, durationMs: outcome.durationMs });
    collected.push(...findings);
    for (const note of result?.notes ?? []) notes.push(`[${task.capability}] ${note}`);
    emit({ type: "agent.state", agentId: agentIdFor(task), state: outcome.status === "completed" ? "completed" : "failed" });
    emit({ type: "agent.reintegrated", agentId: agentIdFor(task) });
  }

  // Consolidate: dedupe findings raised by more than one worker, most severe
  // kept, then rule on the merged set with the Prover.
  let findings = dedupeFindings(sortFindings(collected));
  if (options.prover) {
    findings = await proveAll(map, findings, options.prover, emit);
  }

  // Report is the one action with an effect; it goes through the authorization
  // seam, resolved by the operator who scoped the run — never by a model.
  const reportAction = "write-report";
  emit({ type: "action.proposed", actionId: reportAction, agentId: PRIMARY, summary: "Consolidate findings into the assessment report" });
  emit({ type: "authorization.requested", actionId: reportAction });
  emit({ type: "authorization.resolved", actionId: reportAction, decision: "approved", authority: "operator scope" });
  emit({ type: "action.executing", actionId: reportAction });
  emit({ type: "action.completed", actionId: reportAction });

  emit({ type: "agent.state", agentId: PRIMARY, state: "completed" });
  emit({ type: "conversation.closed" });

  return {
    root: scope.root,
    objective,
    strategy: strategy.name,
    tasks: records,
    prover: options.prover?.name ?? null,
    fileCount: map.files.length,
    findings,
    notes,
  };
}

/** Run the Prover over every finding, narrated as a Prove agent. */
async function proveAll(
  map: RepoMap,
  findings: Finding[],
  prover: Prover,
  emit: (event: UnsequencedEvent) => void,
): Promise<Finding[]> {
  emit({ type: "agent.spawned", agentId: PROVE, parentId: PRIMARY, label: "Prove" });
  emit({ type: "agent.state", agentId: PROVE, state: "running" });

  const proven: Finding[] = [];
  for (const finding of findings) {
    if (finding.rationale !== undefined) {
      proven.push(finding);
      continue;
    }
    let content: string;
    try {
      content = await readMapped(map, finding.file);
    } catch {
      proven.push(finding);
      continue;
    }
    const proof = await prover.prove({ finding, relPath: finding.file, content });
    proven.push({ ...finding, status: proof.status, rationale: proof.rationale });
  }

  const status = countByStatus(proven);
  const action = "prove-leads";
  emit({ type: "action.proposed", actionId: action, agentId: PROVE, summary: `Verify ${findings.length} lead(s): ${status.verified} verified, ${status.dismissed} dismissed, ${status.open} open` });
  emit({ type: "authorization.requested", actionId: action });
  emit({ type: "authorization.resolved", actionId: action, decision: "approved", authority: "operator scope" });
  emit({ type: "action.executing", actionId: action });
  emit({ type: "action.completed", actionId: action });
  emit({ type: "agent.state", agentId: PROVE, state: "completed" });
  emit({ type: "agent.reintegrated", agentId: PROVE });
  return proven;
}

const dedupe = (ids: readonly string[]): string[] => [...new Set(ids)];

/** Drop duplicate findings (same id, or same file:line:cwe), keeping the first. */
function dedupeFindings(sorted: readonly Finding[]): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const f of sorted) {
    const key = `${f.file}:${f.line}:${f.cwe ?? f.title.toLowerCase()}`;
    if (seen.has(f.id) || seen.has(key)) continue;
    seen.add(f.id);
    seen.add(key);
    out.push(f);
  }
  return out;
}

// ---- Strategies ---------------------------------------------------------

/** Dispatch every worker that applies to the repository. The safe default. */
export function allApplicableStrategy(): AssessmentStrategy {
  return {
    name: "strategy:all-applicable",
    select: ({ available }) => available.map((c) => c.capability),
  };
}

/**
 * A light deterministic reasoning pass: if the objective names a concern, run
 * the capabilities that match it; otherwise run everything applicable. Keeps the
 * orchestrator useful with no model, and gives the model strategy a fallback.
 */
export function keywordStrategy(): AssessmentStrategy {
  return {
    name: "strategy:keyword",
    select: ({ objective, available }) => {
      if (!objective) return available.map((c) => c.capability);
      const text = objective.toLowerCase();
      const matched = available.filter(
        (c) =>
          text.includes(c.capability) ||
          c.title.toLowerCase().split(/\W+/).some((w) => w.length > 3 && text.includes(w)),
      );
      return (matched.length ? matched : available).map((c) => c.capability);
    },
  };
}

const STRATEGY_SYSTEM = [
  "You are the planner for an authorized, read-only security assessment. Given an",
  "objective and the worker capabilities available for this repository, choose",
  "which capabilities to dispatch. Respond with ONLY a JSON array of capability",
  'ids, e.g. ["source-vulnerability","dependency-config"]. Pick every capability',
  "relevant to the objective; if the objective is broad or absent, pick them all.",
].join("\n");

/**
 * A model-driven strategy: the orchestrator's reasoning done by a model, behind
 * the same seam, so the plan is chosen rather than fixed. Reuses the model
 * `Transport` (model-agnostic). Any unparseable reply falls back to every
 * applicable capability, so a bad response never empties the assessment.
 */
export function modelStrategy(options: { transport: Transport; name?: string }): AssessmentStrategy {
  const { transport } = options;
  return {
    name: options.name ?? `strategy:${transport.model}`,
    async select({ objective, available }) {
      const all = available.map((c) => c.capability);
      const user = [
        `Objective: ${objective ?? "(none given — assess broadly)"}`,
        "Available capabilities:",
        ...available.map((c) => `- ${c.capability}: ${c.description}`),
        "Reply with a JSON array of the capability ids to run.",
      ].join("\n");
      let reply: string;
      try {
        reply = await transport.complete({ system: STRATEGY_SYSTEM, user });
      } catch {
        return all;
      }
      const picked = parseIdArray(reply).filter((id) => all.includes(id));
      return picked.length ? picked : all;
    },
  };
}

/** Pull the first JSON array of strings out of a reply, tolerant of prose. */
function parseIdArray(text: string): string[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return [];
  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
