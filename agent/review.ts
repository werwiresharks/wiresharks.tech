import { mapRepo, readMapped } from "./map.ts";
import { sortFindings, countByStatus } from "./findings.ts";
import type { Finding } from "./findings.ts";
import type { Reviewer } from "./reviewer.ts";
import type { Prover } from "./prove.ts";
import { runPlan } from "./plan.ts";
import type { Planner } from "./plan.ts";
import type { Scope } from "./scope.ts";
import type { UnsequencedEvent } from "../src/raptor/engine/events.ts";

/**
 * The review orchestrator: Raptor's first end-to-end workflow, the authorized
 * repository security review. It runs the steps the product page names — Scope,
 * Map, Find, Report — over files the Scope has cleared, and narrates its
 * progress as the engine's own event vocabulary so the same session can be
 * watched live in the console. It reads and reports; it does not patch, deploy
 * or touch anything outside the Scope.
 */
export interface ReviewOptions {
  scope: Scope;
  reviewer: Reviewer;
  /**
   * Rules on each lead the reviewer opens, setting it verified/dismissed/open.
   * Omit to stop after Find and leave every finding `open`.
   */
  prover?: Prover;
  /**
   * When set, the Find step is planner-driven: the planner chooses which files
   * to read and review (within scope) instead of reviewing every file. Omit for
   * the exhaustive pass.
   */
  planner?: Planner;
  /** Receives engine events as the review runs; optional. */
  emit?: (event: UnsequencedEvent) => void;
  /** Max files reviewed in parallel (exhaustive Find only). */
  concurrency?: number;
  /** Hard cap on planner turns, when `planner` is set. */
  maxPlanSteps?: number;
}

export interface ReviewResult {
  root: string;
  reviewer: string;
  /** The prover that ruled on the leads, or null when Prove did not run. */
  prover: string | null;
  /** The planner that drove Find, or null for the exhaustive pass. */
  planner: string | null;
  fileCount: number;
  /** Files actually reviewed. Equals fileCount for the exhaustive pass. */
  reviewedCount: number;
  findings: Finding[];
}

const PRIMARY = "raptor";
const WORKER = "find";
const PROVER = "prove";

export async function runReview(options: ReviewOptions): Promise<ReviewResult> {
  const { scope, reviewer } = options;
  const concurrency = Math.max(1, options.concurrency ?? 8);
  const emit = options.emit ?? (() => {});

  emit({ type: "session.reset" });
  emit({ type: "conversation.opened" });
  emit({ type: "agent.spawned", agentId: PRIMARY, parentId: null, label: "Raptor" });
  emit({ type: "agent.state", agentId: PRIMARY, state: "running" });

  // Map: discover the in-scope file set.
  const map = await mapRepo(scope);

  // Find: either a planner chooses what to review (bounded, read-only), or a
  // worker reviews every in-scope file.
  const findings: Finding[] = [];
  let reviewedCount: number;
  if (options.planner) {
    const plan = await runPlan({
      map,
      reviewer,
      planner: options.planner,
      parentAgentId: PRIMARY,
      emit,
      maxSteps: options.maxPlanSteps,
    });
    findings.push(...plan.findings);
    reviewedCount = plan.reviewedFiles.length;
  } else {
    emit({ type: "agent.spawned", agentId: WORKER, parentId: PRIMARY, label: "Find" });
    emit({ type: "agent.state", agentId: WORKER, state: "running" });

    let next = 0;
    const drain = async (): Promise<void> => {
      while (next < map.files.length) {
        const relPath = map.files[next++];
        let content: string;
        try {
          content = await readMapped(map, relPath);
        } catch {
          continue; // unreadable file: skip, do not fail the review
        }
        const found = await reviewer.review({ relPath, content });
        for (const finding of found) {
          findings.push(finding);
          // Each finding is a proposed observation, cited to a file and line.
          emit({
            type: "action.proposed",
            actionId: finding.id,
            agentId: WORKER,
            summary: `${finding.severity.toUpperCase()} ${finding.cwe ?? ""} ${finding.file}:${finding.line} — ${finding.title}`.replace(/\s+/g, " ").trim(),
          });
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(concurrency, map.files.length || 1) }, drain),
    );
    reviewedCount = map.files.length;

    emit({ type: "agent.state", agentId: WORKER, state: "completed" });
    emit({ type: "agent.reintegrated", agentId: WORKER });
  }

  // Prove: a worker re-examines each lead in the file that raised it and records
  // a verdict — verified, dismissed, or left open. Still strictly read-only: it
  // reads the same in-scope files Find did and reaches nothing outside the Scope.
  let proven = findings;
  if (options.prover) {
    const prover = options.prover;
    emit({ type: "agent.spawned", agentId: PROVER, parentId: PRIMARY, label: "Prove" });
    emit({ type: "agent.state", agentId: PROVER, state: "running" });

    proven = [];
    for (const finding of findings) {
      let content: string;
      try {
        content = await readMapped(map, finding.file);
      } catch {
        proven.push(finding); // the file is unreadable now: leave the lead open
        continue;
      }
      const proof = await prover.prove({ finding, relPath: finding.file, content });
      proven.push({ ...finding, status: proof.status, rationale: proof.rationale });
    }

    const status = countByStatus(proven);
    const proveAction = "prove-leads";
    emit({
      type: "action.proposed",
      actionId: proveAction,
      agentId: PROVER,
      summary: `Verify ${findings.length} lead(s): ${status.verified} verified, ${status.dismissed} dismissed, ${status.open} open`,
    });
    emit({ type: "authorization.requested", actionId: proveAction });
    emit({ type: "authorization.resolved", actionId: proveAction, decision: "approved", authority: "operator scope" });
    emit({ type: "action.executing", actionId: proveAction });
    emit({ type: "action.completed", actionId: proveAction });
    emit({ type: "agent.state", agentId: PROVER, state: "completed" });
    emit({ type: "agent.reintegrated", agentId: PROVER });
  }

  // Report: writing the report is the one action with an effect, so it goes
  // through the authorization seam the engine models — resolved by the operator
  // who scoped the run, never by the reviewer.
  const reportAction = "write-report";
  emit({ type: "action.proposed", actionId: reportAction, agentId: PRIMARY, summary: "Write the review report" });
  emit({ type: "authorization.requested", actionId: reportAction });
  emit({ type: "authorization.resolved", actionId: reportAction, decision: "approved", authority: "operator scope" });
  emit({ type: "action.executing", actionId: reportAction });
  emit({ type: "action.completed", actionId: reportAction });

  emit({ type: "agent.state", agentId: PRIMARY, state: "completed" });
  emit({ type: "conversation.closed" });

  return {
    root: scope.root,
    reviewer: reviewer.name,
    prover: options.prover?.name ?? null,
    planner: options.planner?.name ?? null,
    fileCount: map.files.length,
    reviewedCount,
    findings: sortFindings(proven),
  };
}
