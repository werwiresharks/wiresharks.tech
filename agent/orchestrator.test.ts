import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveScope } from "./scope.ts";
import { mapRepo } from "./map.ts";
import { patternReviewer } from "./reviewer.ts";
import { contextProver } from "./prove.ts";
import { WorkerRegistry, scopedReader } from "./worker.ts";
import type { InvestigationWorker, WorkerContext } from "./worker.ts";
import { sourceVulnWorker, dependencyWorker } from "./workers.ts";
import {
  runAssessment,
  allApplicableStrategy,
  keywordStrategy,
  modelStrategy,
} from "./orchestrator.ts";
import type { Transport } from "./modelReviewer.ts";
import { createModel, reduce } from "../src/raptor/engine/model.ts";
import type { UnsequencedEvent } from "../src/raptor/engine/events.ts";

async function fixtureRepo() {
  const dir = await mkdtemp(join(tmpdir(), "orch-"));
  await writeFile(join(dir, "ingest.py"), "obj = pickle.loads(body)\n");
  await writeFile(join(dir, "requirements.txt"), "flask==2.0.0\nrequests\n# a comment\n");
  await writeFile(join(dir, "package.json"), JSON.stringify({ dependencies: { left: "*", ok: "^1.2.3" } }, null, 2) + "\n");
  return dir;
}

function defaultRegistry() {
  return new WorkerRegistry()
    .register(sourceVulnWorker(patternReviewer()))
    .register(dependencyWorker());
}

/** Replay narration through the real engine reducer, asserting each event is accepted. */
function assertReducible(events: UnsequencedEvent[]) {
  let model = createModel();
  let seq = 0;
  for (const e of events) {
    const r = reduce(model, { ...e, seq: ++seq } as never);
    assert.ok(r.accepted, `reducer accepted ${e.type}`);
    model = r.model;
  }
}

test("the orchestrator dispatches applicable workers in parallel and consolidates", async () => {
  const dir = await fixtureRepo();
  try {
    const scope = resolveScope({ root: dir });
    const events: UnsequencedEvent[] = [];
    const result = await runAssessment({
      scope,
      registry: defaultRegistry(),
      prover: contextProver(),
      emit: (e) => events.push(e),
    });

    // Two specialized workers ran, both completed.
    assert.equal(result.tasks.length, 2);
    assert.ok(result.tasks.every((t) => t.status === "completed"));
    const caps = result.tasks.map((t) => t.task.capability).sort();
    assert.deepEqual(caps, ["dependency-config", "source-vulnerability"]);

    // Findings from both workers are present and attributed to their source.
    const bySource = new Set(result.findings.map((f) => f.source));
    assert.ok(bySource.has("source-vulnerability"), "source worker contributed");
    assert.ok(bySource.has("dependency-config"), "dependency worker contributed");

    // The pickle lead is proven; the unpinned-dependency lead stays open.
    const pickle = result.findings.find((f) => f.cwe === "CWE-502");
    assert.equal(pickle?.status, "verified");
    const unpinned = result.findings.find((f) => f.id.startsWith("dep-unpinned") && f.evidence.includes("requests"));
    assert.ok(unpinned, "the unpinned `requests` requirement was flagged");
    assert.equal(unpinned!.status, "open");

    // The npm floating range was flagged, the pinned caret range was not.
    assert.ok(result.findings.some((f) => f.evidence.includes('"left"')), "floating npm range flagged");
    assert.ok(!result.findings.some((f) => f.evidence.includes('"ok"')), "a pinned caret range is not flagged");

    // The whole session — parallel worker agents and all — replays cleanly.
    assertReducible(events);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("capability discovery skips workers with nothing to do", async () => {
  const dir = await mkdtemp(join(tmpdir(), "orch-"));
  try {
    await writeFile(join(dir, "only.py"), "x = 1\n");
    const scope = resolveScope({ root: dir });
    const map = await mapRepo(scope);
    const applicable = defaultRegistry().applicable(map).map((w) => w.capability);
    assert.deepEqual(applicable, ["source-vulnerability"], "no manifests, so no dependency worker");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the keyword strategy narrows the worker set to the objective", async () => {
  const dir = await fixtureRepo();
  try {
    const scope = resolveScope({ root: dir });
    const result = await runAssessment({
      scope,
      registry: defaultRegistry(),
      objective: "audit our dependency supply chain",
      strategy: keywordStrategy(),
    });
    assert.deepEqual(result.tasks.map((t) => t.task.capability), ["dependency-config"]);
    assert.equal(result.strategy, "strategy:keyword");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a model strategy chooses the plan, and a bad reply falls back to all", async () => {
  const dir = await fixtureRepo();
  try {
    const scope = resolveScope({ root: dir });

    const picks: Transport = { model: "fake", async complete() { return 'I suggest ["source-vulnerability"].'; } };
    const narrowed = await runAssessment({ scope, registry: defaultRegistry(), strategy: modelStrategy({ transport: picks }) });
    assert.deepEqual(narrowed.tasks.map((t) => t.task.capability), ["source-vulnerability"]);

    const garbage: Transport = { model: "fake", async complete() { return "no json here"; } };
    const fellBack = await runAssessment({ scope, registry: defaultRegistry(), strategy: modelStrategy({ transport: garbage }) });
    assert.equal(fellBack.tasks.length, 2, "an unparseable plan still runs every applicable worker");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a worker cannot read outside the scope, even if it tries", async () => {
  const dir = await mkdtemp(join(tmpdir(), "orch-"));
  try {
    await writeFile(join(dir, "in.py"), "x = 1\n");
    const scope = resolveScope({ root: dir });
    const map = await mapRepo(scope);
    const read = scopedReader(map);
    await assert.rejects(() => read("../../../etc/passwd"), /not an in-scope file/);
    await assert.rejects(() => read("/etc/hosts"), /not an in-scope file/);
    await read("in.py"); // the in-scope file reads fine

    // And a hostile worker that reaches out produces no findings and still completes.
    const rogue: InvestigationWorker = {
      capability: "rogue",
      title: "Rogue",
      description: "tries to escape scope",
      applicableTo: () => true,
      async run(ctx: WorkerContext) {
        await assert.rejects(() => ctx.read("/etc/passwd"));
        return { findings: [], notes: ["could not escape scope"] };
      },
    };
    const result = await runAssessment({ scope, registry: new WorkerRegistry().register(rogue), strategy: allApplicableStrategy() });
    assert.equal(result.tasks[0].status, "completed");
    assert.equal(result.findings.length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
