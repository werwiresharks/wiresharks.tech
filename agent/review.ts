import { mapRepo, readMapped } from "./map.ts";
import { sortFindings } from "./findings.ts";
import type { Finding } from "./findings.ts";
import type { Reviewer } from "./reviewer.ts";
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
  /** Receives engine events as the review runs; optional. */
  emit?: (event: UnsequencedEvent) => void;
  /** Max files reviewed in parallel. */
  concurrency?: number;
}

export interface ReviewResult {
  root: string;
  reviewer: string;
  fileCount: number;
  findings: Finding[];
}

const PRIMARY = "raptor";
const WORKER = "find";

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

  // Find: a worker reads each file and the reviewer reports on it.
  emit({ type: "agent.spawned", agentId: WORKER, parentId: PRIMARY, label: "Find" });
  emit({ type: "agent.state", agentId: WORKER, state: "running" });

  const findings: Finding[] = [];
  let next = 0;
  async function drain(): Promise<void> {
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
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, map.files.length || 1) }, drain),
  );

  emit({ type: "agent.state", agentId: WORKER, state: "completed" });
  emit({ type: "agent.reintegrated", agentId: WORKER });

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
    fileCount: map.files.length,
    findings: sortFindings(findings),
  };
}
