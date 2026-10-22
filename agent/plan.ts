import { readMapped } from "./map.ts";
import type { RepoMap } from "./map.ts";
import { globToRegExp } from "./scope.ts";
import { sortFindings } from "./findings.ts";
import type { Finding } from "./findings.ts";
import type { Reviewer } from "./reviewer.ts";
import type { Transport } from "./modelReviewer.ts";
import type { UnsequencedEvent } from "../src/raptor/engine/events.ts";

/**
 * The planning loop: a read-only agent loop for the Find step.
 *
 * The exhaustive Find reviews every in-scope file. A planner instead *decides*
 * what to look at next — list the repo, read an entry point, review the files
 * that look risky, then stop — which is the first piece of `agent/` that chooses
 * its own actions rather than running a fixed script. It stays strictly inside
 * the authorization boundary: every tool acts only on the Scope's already-mapped
 * file set, so a planner can never read or review a path outside it, however it
 * is asked. The loop is bounded by a step budget and only ever reads and
 * reviews; it has no tool that changes anything.
 *
 * The `Planner` seam mirrors `Reviewer`/`Transport`: `modelPlanner` lets a model
 * drive the loop, and a scripted planner drives it deterministically in tests.
 */
export type PlanAction =
  | { tool: "list"; glob?: string }
  | { tool: "search"; pattern: string; glob?: string }
  | { tool: "read"; file: string }
  | { tool: "review"; file: string }
  | { tool: "finish"; reason?: string };

export const PLAN_TOOLS = ["list", "search", "read", "review", "finish"] as const;

export interface PlanStep {
  action: PlanAction;
  /** What the tool returned, as text — the observation fed back to the planner. */
  result: string;
  /** False when the action was refused (out of scope, unknown file, repeat). */
  ok: boolean;
}

/** What the planner sees before choosing its next action. */
export interface PlanState {
  /** Every in-scope file (the Scope's mapped set). */
  files: readonly string[];
  /** Files already reviewed this run. */
  reviewed: readonly string[];
  findingCount: number;
  history: readonly PlanStep[];
  stepsLeft: number;
}

export interface Planner {
  readonly name: string;
  next(state: PlanState): PlanAction | Promise<PlanAction>;
}

export interface PlanOptions {
  /** The in-scope file set; the loop never touches anything outside it. */
  map: RepoMap;
  reviewer: Reviewer;
  planner: Planner;
  /** The agent that owns the planner, for narration. */
  parentAgentId: string;
  plannerAgentId?: string;
  emit?: (event: UnsequencedEvent) => void;
  /** Hard cap on planner turns. Default 24. */
  maxSteps?: number;
  /** Files larger than this are read truncated. Default 64 KiB. */
  maxReadBytes?: number;
}

export interface PlanResult {
  planner: string;
  steps: PlanStep[];
  reviewedFiles: string[];
  findings: Finding[];
}

const describe = (action: PlanAction): string => {
  switch (action.tool) {
    case "list":
      return `List files${action.glob ? ` matching ${action.glob}` : ""}`;
    case "search":
      return `Search for ${action.pattern}${action.glob ? ` in ${action.glob}` : ""}`;
    case "read":
      return `Read ${action.file}`;
    case "review":
      return `Review ${action.file}`;
    case "finish":
      return `Finish${action.reason ? `: ${action.reason}` : ""}`;
  }
};

/** A pattern as a regex, or — if it is not valid regex — as a literal match. */
function safeRegExp(pattern: string): RegExp {
  try {
    return new RegExp(pattern);
  } catch {
    return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  }
}

/** Cap on matches a single search returns, so one action stays bounded. */
const SEARCH_LIMIT = 50;

export async function runPlan(options: PlanOptions): Promise<PlanResult> {
  const { map, reviewer, planner, parentAgentId } = options;
  const agentId = options.plannerAgentId ?? "planner";
  const emit = options.emit ?? (() => {});
  const maxSteps = Math.max(1, options.maxSteps ?? 24);
  const maxReadBytes = options.maxReadBytes ?? 64 * 1024;
  const inScope = new Set(map.files);

  emit({ type: "agent.spawned", agentId, parentId: parentAgentId, label: "Plan" });
  emit({ type: "agent.state", agentId, state: "running" });

  const history: PlanStep[] = [];
  const reviewed = new Set<string>();
  const findings: Finding[] = [];

  for (let i = 0; i < maxSteps; i += 1) {
    const action = await planner.next({
      files: map.files,
      reviewed: [...reviewed],
      findingCount: findings.length,
      history,
      stepsLeft: maxSteps - i,
    });

    const actionId = `plan-${i + 1}`;
    emit({ type: "action.proposed", actionId, agentId, summary: describe(action) });
    emit({ type: "authorization.requested", actionId });
    emit({ type: "authorization.resolved", actionId, decision: "approved", authority: "operator scope" });
    emit({ type: "action.executing", actionId });

    const step = await execute(action, {
      map,
      inScope,
      reviewer,
      reviewed,
      findings,
      maxReadBytes,
    });
    history.push(step);
    emit({ type: step.ok ? "action.completed" : "action.failed", actionId });

    if (action.tool === "finish") break;
  }

  emit({ type: "agent.state", agentId, state: "completed" });
  emit({ type: "agent.reintegrated", agentId });

  return {
    planner: planner.name,
    steps: history,
    reviewedFiles: [...reviewed],
    findings: sortFindings(findings),
  };
}

interface ExecDeps {
  map: RepoMap;
  inScope: Set<string>;
  reviewer: Reviewer;
  reviewed: Set<string>;
  findings: Finding[];
  maxReadBytes: number;
}

async function execute(action: PlanAction, deps: ExecDeps): Promise<PlanStep> {
  switch (action.tool) {
    case "list": {
      const re = action.glob ? globToRegExp(action.glob) : null;
      const matched = re ? deps.map.files.filter((f) => re.test(f)) : deps.map.files;
      const shown = matched.slice(0, 200);
      const more = matched.length > shown.length ? ` (+${matched.length - shown.length} more)` : "";
      return { action, ok: true, result: `${matched.length} file(s): ${shown.join(", ")}${more}` };
    }
    case "search": {
      const re = safeRegExp(action.pattern);
      const fileRe = action.glob ? globToRegExp(action.glob) : null;
      const files = fileRe ? deps.map.files.filter((f) => fileRe.test(f)) : deps.map.files;
      const hits: string[] = [];
      for (const file of files) {
        if (hits.length >= SEARCH_LIMIT) break;
        const text = await readMapped(deps.map, file).catch(() => null);
        if (text === null) continue;
        const lines = text.split("\n");
        for (let i = 0; i < lines.length && hits.length < SEARCH_LIMIT; i += 1) {
          if (re.test(lines[i])) hits.push(`${file}:${i + 1}: ${lines[i].trim().slice(0, 160)}`);
        }
      }
      return {
        action,
        ok: true,
        result: hits.length ? `${hits.length} match(es):\n${hits.join("\n")}` : `no matches for ${action.pattern}`,
      };
    }
    case "read": {
      if (!deps.inScope.has(action.file))
        return { action, ok: false, result: `denied: ${action.file} is not an in-scope file` };
      const text = await readMapped(deps.map, action.file).catch(() => null);
      if (text === null) return { action, ok: false, result: `could not read ${action.file}` };
      const clipped = Buffer.byteLength(text, "utf8") > deps.maxReadBytes;
      return {
        action,
        ok: true,
        result: `${action.file} (${text.split("\n").length} lines):\n${text.slice(0, deps.maxReadBytes)}${clipped ? "\n…(truncated)" : ""}`,
      };
    }
    case "review": {
      if (!deps.inScope.has(action.file))
        return { action, ok: false, result: `denied: ${action.file} is not an in-scope file` };
      if (deps.reviewed.has(action.file))
        return { action, ok: false, result: `${action.file} already reviewed` };
      const text = await readMapped(deps.map, action.file).catch(() => null);
      if (text === null) return { action, ok: false, result: `could not read ${action.file}` };
      deps.reviewed.add(action.file);
      const found = await deps.reviewer.review({ relPath: action.file, content: text });
      deps.findings.push(...found);
      const summary = found.length
        ? found.map((f) => `${f.severity} ${f.cwe ?? ""} ${f.file}:${f.line}`.replace(/\s+/g, " ").trim()).join("; ")
        : "no findings";
      return { action, ok: true, result: `reviewed ${action.file}: ${found.length} finding(s)${found.length ? ` — ${summary}` : ""}` };
    }
    case "finish":
      return { action, ok: true, result: action.reason ?? "done" };
  }
}

/** A planner whose moves are a fixed list, for tests and scripted runs. */
export function scriptedPlanner(actions: readonly PlanAction[], name = "scripted"): Planner {
  let i = 0;
  return {
    name,
    next(): PlanAction {
      return i < actions.length ? actions[i++] : { tool: "finish", reason: "script exhausted" };
    },
  };
}

const SYSTEM_PROMPT = [
  "You are the planner for an authorized, read-only security review of a",
  "repository the operator controls. You choose one action at a time to find the",
  "files most worth reviewing, then finish. You can only read and review files;",
  "you cannot change anything, and you can only act on in-scope files.",
  "",
  "Tools (respond with exactly one, as a single JSON object, no prose):",
  '  {"tool":"list","glob":"<optional glob>"}            — list in-scope files',
  '  {"tool":"search","pattern":"<regex>","glob":"..."}  — grep in-scope files',
  '  {"tool":"read","file":"<path>"}                     — read a file to understand it',
  '  {"tool":"review","file":"<path>"}                   — run the detector on a file',
  '  {"tool":"finish","reason":"<why>"}                  — stop',
  "",
  "Prioritize files that handle input, auth, crypto, serialization, subprocess or",
  "network calls. Review the files that matter; do not review every file. Finish",
  "once the risky files are reviewed or the step budget is low.",
].join("\n");

/** Pull the first balanced JSON object out of a reply, tolerant of fences. */
function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function toAction(raw: unknown): PlanAction | null {
  if (typeof raw !== "object" || raw === null) return null;
  const item = raw as Record<string, unknown>;
  const tool = item.tool;
  if (tool === "finish")
    return { tool: "finish", reason: typeof item.reason === "string" ? item.reason : undefined };
  if (tool === "list")
    return { tool: "list", glob: typeof item.glob === "string" ? item.glob : undefined };
  if (tool === "search" && typeof item.pattern === "string")
    return { tool: "search", pattern: item.pattern, glob: typeof item.glob === "string" ? item.glob : undefined };
  if ((tool === "read" || tool === "review") && typeof item.file === "string")
    return { tool, file: item.file };
  return null;
}

/** Render the current state compactly for the model. */
function statePrompt(state: PlanState): string {
  const recent = state.history.slice(-6).map((s) => `- ${describe(s.action)} → ${s.result.slice(0, 300)}`);
  return [
    `In-scope files (${state.files.length}): ${state.files.slice(0, 200).join(", ")}`,
    `Reviewed so far (${state.reviewed.length}): ${state.reviewed.join(", ") || "none"}`,
    `Findings so far: ${state.findingCount}. Steps left: ${state.stepsLeft}.`,
    recent.length ? `Recent actions:\n${recent.join("\n")}` : "No actions yet.",
    "Choose the next action as one JSON object.",
  ].join("\n\n");
}

/**
 * A model-driven planner. Reuses the model `Transport`: each turn it sends the
 * current state and the planner reads back one JSON action. An unparseable or
 * invalid reply ends the run (the loop stays bounded and never guesses an
 * action the model did not ask for).
 */
export function modelPlanner(options: { transport: Transport; name?: string }): Planner {
  const { transport } = options;
  return {
    name: options.name ?? `planner:${transport.model}`,
    async next(state: PlanState): Promise<PlanAction> {
      let reply: string;
      try {
        reply = await transport.complete({ system: SYSTEM_PROMPT, user: statePrompt(state) });
      } catch {
        return { tool: "finish", reason: "planner transport failed" };
      }
      return toAction(extractJsonObject(reply)) ?? { tool: "finish", reason: "planner returned no valid action" };
    },
  };
}
