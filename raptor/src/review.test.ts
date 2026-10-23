import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveScope } from "./scope.ts";
import { patternReviewer } from "./reviewer.ts";
import { contextProver } from "./prove.ts";
import { runReview } from "./review.ts";
import { renderReport } from "./report.ts";
import type { UnsequencedEvent } from "./events.ts";

async function fixtureRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "review-"));
  await writeFile(join(dir, "upload.py"), "data = pickle.loads(body)\n");
  await writeFile(join(dir, "safe.py"), "data = json.loads(body)\n");
  await mkdir(join(dir, "node_modules", "pkg"), { recursive: true });
  await writeFile(join(dir, "node_modules", "pkg", "evil.py"), "pickle.loads(x)\n");
  return dir;
}

test("runReview maps in scope, finds issues, and skips excluded dirs", async () => {
  const dir = await fixtureRepo();
  try {
    const scope = resolveScope({ root: dir });
    const result = await runReview({ scope, reviewer: patternReviewer() });
    // node_modules is pruned, so only upload.py and safe.py are mapped.
    assert.equal(result.fileCount, 2);
    assert.equal(result.findings.length, 1, "only upload.py trips a rule");
    assert.equal(result.findings[0].file, "upload.py");
    assert.equal(result.findings[0].cwe, "CWE-502");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("runReview narrates a well-formed engine session", async () => {
  const dir = await fixtureRepo();
  try {
    const scope = resolveScope({ root: dir });
    const events: UnsequencedEvent[] = [];
    await runReview({ scope, reviewer: patternReviewer(), emit: (e) => events.push(e) });
    const types = events.map((e) => e.type);
    assert.equal(types[0], "session.reset");
    assert.equal(types[1], "conversation.opened");
    assert.equal(types.at(-1), "conversation.closed");
    assert.ok(types.includes("agent.spawned"));
    // The report write is authorized before it executes.
    const reqIdx = types.indexOf("authorization.requested");
    const execIdx = types.indexOf("action.executing");
    assert.ok(reqIdx !== -1 && reqIdx < execIdx, "requested before executing");
    const resolved = events.find((e) => e.type === "authorization.resolved");
    assert.equal(resolved?.type === "authorization.resolved" && resolved.decision, "approved");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("emitted events feed the engine reducer without rejection", async () => {
  // The session server assigns seqs; here we just assert the shapes are the
  // engine's own vocabulary by replaying them through the real reducer.
  const { createModel, reduce } = await import("./narration.ts");
  const dir = await fixtureRepo();
  try {
    const scope = resolveScope({ root: dir });
    const events: UnsequencedEvent[] = [];
    await runReview({ scope, reviewer: patternReviewer(), emit: (e) => events.push(e) });
    let model = createModel();
    let seq = 0;
    for (const e of events) {
      const result = reduce(model, { ...e, seq: ++seq } as never);
      assert.ok(result.accepted, `reducer accepted ${e.type}`);
      model = result.model;
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the Prove step rules each lead and narrates a reducer-valid session", async () => {
  const { createModel, reduce } = await import("./narration.ts");
  const dir = await mkdtemp(join(tmpdir(), "review-"));
  try {
    // One lead that proves out and one that is dismissed as a placeholder.
    await writeFile(join(dir, "ingest.py"), "obj = pickle.loads(body)\n");
    await writeFile(join(dir, "config.py"), 'password = "changeme123"\n');
    const scope = resolveScope({ root: dir });
    const events: UnsequencedEvent[] = [];
    const result = await runReview({
      scope,
      reviewer: patternReviewer(),
      prover: contextProver(),
      emit: (e) => events.push(e),
    });

    assert.equal(result.prover, "context");
    const pickle = result.findings.find((f) => f.file === "ingest.py");
    const secret = result.findings.find((f) => f.file === "config.py");
    assert.equal(pickle?.status, "verified");
    assert.equal(secret?.status, "dismissed");
    assert.ok(pickle?.rationale && secret?.rationale, "a ruled lead carries its reasoning");

    // The Prove worker and its verification action replay cleanly.
    const types = events.map((e) => e.type);
    assert.ok(
      events.some((e) => e.type === "agent.spawned" && e.label === "Prove"),
      "a Prove worker is spawned",
    );
    assert.ok(types.includes("action.completed"), "the verification action completes");
    let model = createModel();
    let seq = 0;
    for (const e of events) {
      const r = reduce(model, { ...e, seq: ++seq } as never);
      assert.ok(r.accepted, `reducer accepted ${e.type}`);
      model = r.model;
    }

    // The report shows verdicts and the reasoning behind them.
    const report = renderReport(result);
    assert.match(report, /Verification: 1 verified, 1 dismissed, 0 open/);
    assert.match(report, /## Verification/);
    assert.match(report, /\*\*verified\*\*/);
    assert.match(report, /\*\*dismissed\*\*/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("renderReport summarizes findings and an empty pass", async () => {
  const dir = await fixtureRepo();
  try {
    const scope = resolveScope({ root: dir });
    const result = await runReview({ scope, reviewer: patternReviewer() });
    const report = renderReport(result);
    assert.match(report, /# Raptor review/);
    assert.match(report, /CWE-502/);
    assert.match(report, /upload\.py:1/);

    const empty = renderReport({ root: dir, reviewer: "pattern", prover: null, planner: null, fileCount: 0, reviewedCount: 0, findings: [] });
    assert.match(empty, /No findings/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
