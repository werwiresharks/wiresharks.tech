#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { argv, exit, stdout } from "node:process";
import { resolveScope, DEFAULT_EXCLUDE } from "./scope.ts";
import { patternReviewer } from "./reviewer.ts";
import type { Reviewer } from "./reviewer.ts";
import { modelReviewer, anthropicTransport, compositeReviewer } from "./modelReviewer.ts";
import { modelPlanner } from "./plan.ts";
import type { Planner } from "./plan.ts";
import { contextProver } from "./prove.ts";
import type { Prover } from "./prove.ts";
import { modelProver, firstDecisiveProver } from "./modelProver.ts";
import { runReview } from "./review.ts";
import { WorkerRegistry } from "./worker.ts";
import { sourceVulnWorker, dependencyWorker } from "./workers.ts";
import { runAssessment, keywordStrategy, modelStrategy } from "./orchestrator.ts";
import type { AssessmentStrategy } from "./orchestrator.ts";
import { renderReport, renderAssessment } from "./report.ts";
import type { Finding } from "./findings.ts";

/**
 * The Raptor review CLI. The authorization is the first argument: a repository
 * path the operator names explicitly. Without it, nothing runs. The review is
 * read-only — it maps, finds and writes a report; it never patches, deploys or
 * reaches outside the named path.
 *
 *   raptor review <path> [--scope <glob,...>] [--exclude <glob,...>]
 *                                    [--out <file>] [--quiet] [--no-prove]
 *                                    [--model | --model=<id>]
 *
 * By default the review also runs the Prove step, ruling each lead
 * verified/dismissed/open. Exits non-zero when a high or critical finding is
 * present and not dismissed, so it can gate CI without failing on a lead the
 * Prove step ruled out.
 *
 * `--model` adds an aligned model to the Find step (alongside the offline
 * pattern pass), so defects are found by model reasoning, not only regex. It
 * reads ANTHROPIC_API_KEY; `--model=<id>` picks the model (default
 * claude-opus-5-5). `--plan` makes Find planner-driven: a model chooses which
 * in-scope files to read and review instead of reviewing every file (read-only,
 * bounded, also needs ANTHROPIC_API_KEY).
 *
 *   raptor assess <path> [--objective "<text>"] [shared flags]
 *
 * `assess` runs the orchestrator: it discovers which specialized workers apply
 * to the repository, dispatches them in parallel, and consolidates their
 * findings into one report. `--objective` shapes which workers run; with
 * `--model` the orchestrator lets a model choose the plan. Same read-only
 * boundary and the same CI gate as `review`.
 */
const USAGE =
  "Usage: raptor <review|assess> <path> [--scope <glob,...>] [--exclude <glob,...>] [--out <file>] [--objective <text>] [--quiet] [--no-prove] [--model | --model=<id>] [--plan]";

interface Args {
  command: string;
  root?: string;
  include: string[];
  exclude: string[];
  out?: string;
  objective?: string;
  quiet: boolean;
  prove: boolean;
  model: boolean;
  modelId?: string;
  plan: boolean;
}

function parseArgs(args: readonly string[]): Args {
  const parsed: Args = { command: args[0] ?? "", include: [], exclude: [], quiet: false, prove: true, model: false, plan: false };
  const rest = args.slice(1);
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--scope") parsed.include.push(...splitList(rest[++i]));
    else if (arg === "--exclude") parsed.exclude.push(...splitList(rest[++i]));
    else if (arg === "--out") parsed.out = rest[++i];
    else if (arg === "--objective") parsed.objective = rest[++i];
    else if (arg === "--quiet") parsed.quiet = true;
    else if (arg === "--no-prove") parsed.prove = false;
    else if (arg === "--model") parsed.model = true;
    else if (arg.startsWith("--model=")) {
      parsed.model = true;
      parsed.modelId = arg.slice("--model=".length);
    } else if (arg === "--plan") parsed.plan = true;
    else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    else if (parsed.root === undefined) parsed.root = arg;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  return parsed;
}

const splitList = (value: string | undefined): string[] =>
  (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);

async function main(): Promise<number> {
  let args: Args;
  try {
    args = parseArgs(argv.slice(2));
  } catch (error) {
    console.error((error as Error).message);
    console.error(USAGE);
    return 2;
  }

  if (args.command !== "review" && args.command !== "assess") {
    console.error(USAGE);
    return 2;
  }
  if (!args.root) {
    console.error("A repository path is required. Raptor only reviews a path you name.");
    console.error(USAGE);
    return 2;
  }

  let scope;
  try {
    scope = resolveScope({
      root: args.root,
      include: args.include,
      exclude: args.exclude.length > 0 ? args.exclude : DEFAULT_EXCLUDE,
    });
  } catch (error) {
    console.error(`Cannot scope the review: ${(error as Error).message}`);
    return 2;
  }

  if ((args.model || args.plan) && !process.env.ANTHROPIC_API_KEY) {
    console.error(
      `${args.plan ? "--plan" : "--model"} needs ANTHROPIC_API_KEY set (an aligned-model key). It is read at run time and never stored.`,
    );
    return 2;
  }

  const transport = () => anthropicTransport(args.modelId ? { model: args.modelId } : {});

  let reviewer: Reviewer = patternReviewer();
  if (args.model) {
    reviewer = compositeReviewer([patternReviewer(), modelReviewer({ transport: transport() })]);
  }

  // With a model available, let it rule on the leads the deterministic prover
  // cannot (model-found findings have no built-in rule); the deterministic
  // verdict still wins when it exists.
  let prover: Prover | undefined;
  if (args.prove) {
    prover = args.model
      ? firstDecisiveProver([contextProver(), modelProver({ transport: transport() })])
      : contextProver();
  }

  const emit = args.quiet ? undefined : (e: { type: string }) => stdout.write(`· ${e.type}\n`);

  let findings: Finding[];
  let report: string;
  if (args.command === "assess") {
    // Orchestrated: discover applicable workers, dispatch them in parallel, and
    // consolidate. The source worker reuses the same reviewer the CLI built.
    const registry = new WorkerRegistry()
      .register(sourceVulnWorker(reviewer))
      .register(dependencyWorker());
    const strategy: AssessmentStrategy = args.model
      ? modelStrategy({ transport: transport() })
      : keywordStrategy();
    const result = await runAssessment({ scope, registry, objective: args.objective, prover, strategy, emit });
    findings = result.findings;
    report = renderAssessment(result);
  } else {
    let planner: Planner | undefined;
    if (args.plan) planner = modelPlanner({ transport: transport() });
    const result = await runReview({ scope, reviewer, planner, prover, emit });
    findings = result.findings;
    report = renderReport(result);
  }

  if (args.out) {
    await writeFile(args.out, report, "utf8");
    console.error(`Wrote ${findings.length} finding(s) to ${args.out}`);
  } else {
    stdout.write("\n" + report);
  }

  // A high/critical lead gates CI unless the Prove step dismissed it. Verified
  // and still-open leads both block; only a dismissed one is cleared.
  const blocking = findings.some(
    (f) => (f.severity === "high" || f.severity === "critical") && f.status !== "dismissed",
  );
  return blocking ? 1 : 0;
}

main().then(
  (code) => exit(code),
  (error) => {
    console.error(error);
    exit(2);
  },
);
