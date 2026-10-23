import { resolveScope, DEFAULT_EXCLUDE } from "../raptor/src/scope.ts";
import { patternReviewer } from "../raptor/src/reviewer.ts";
import type { Reviewer } from "../raptor/src/reviewer.ts";
import { contextProver } from "../raptor/src/prove.ts";
import type { Prover } from "../raptor/src/prove.ts";
import type { Planner } from "../raptor/src/plan.ts";
import { runReview } from "../raptor/src/review.ts";
import type { ScenarioStep } from "./scenario.ts";
import type { RaptorEventType, UnsequencedEvent } from "../src/raptor/engine/events.ts";

/**
 * Record a real Raptor review as a playable scenario.
 *
 * The live console used to stream a hand-written script. This runs the actual
 * review pipeline — the same Scope, pattern Reviewer and context Prover the CLI
 * uses — over a named directory and captures the events it narrates, so the
 * console can play back a genuine review (real findings, real verdicts) rather
 * than a fiction. The review is read-only; it only maps and reports the target.
 *
 * Capturing to steps (rather than appending live) lets the existing
 * `playScenario` pace and loop the session for a legible visualization: a tiny
 * repo is reviewed in milliseconds, which would otherwise flash past on screen.
 */

/** How long to dwell before each event, so the session reads as a sequence. */
const DELAYS: Partial<Record<RaptorEventType, number>> = {
  "session.reset": 0,
  "conversation.opened": 300,
  "agent.spawned": 550,
  "agent.state": 400,
  "agent.reintegrated": 400,
  "action.proposed": 350,
  "authorization.requested": 550,
  "authorization.resolved": 850,
  "action.executing": 450,
  "action.completed": 750,
  "conversation.closed": 500,
};
const DEFAULT_DELAY = 400;

const delayFor = (event: UnsequencedEvent): number =>
  event.type === "session.reset" ? 0 : (DELAYS[event.type] ?? DEFAULT_DELAY);

export interface RecordReviewOptions {
  /** The directory to review. Must exist; the review never escapes it. */
  root: string;
  include?: readonly string[];
  exclude?: readonly string[];
  /** Defaults to the offline pattern reviewer. */
  reviewer?: Reviewer;
  /** Defaults to the offline context prover. */
  prover?: Prover;
  /** When set, Find is planner-driven instead of exhaustive. */
  planner?: Planner;
}

/** Run a review of `root` and return its narration as paced scenario steps. */
export async function recordReview(
  options: RecordReviewOptions,
): Promise<ScenarioStep[]> {
  const scope = resolveScope({
    root: options.root,
    include: options.include ?? [],
    exclude:
      options.exclude && options.exclude.length > 0
        ? options.exclude
        : DEFAULT_EXCLUDE,
  });

  const steps: ScenarioStep[] = [];
  await runReview({
    scope,
    reviewer: options.reviewer ?? patternReviewer(),
    prover: options.prover ?? contextProver(),
    planner: options.planner,
    emit: (event) => steps.push({ delayMs: delayFor(event), event }),
  });
  return steps;
}
