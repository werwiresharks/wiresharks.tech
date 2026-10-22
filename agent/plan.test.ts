import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveScope } from "./scope.ts";
import { mapRepo } from "./map.ts";
import { patternReviewer } from "./reviewer.ts";
import { runPlan, scriptedPlanner, modelPlanner } from "./plan.ts";
import type { PlanAction } from "./plan.ts";
import type { Transport } from "./modelReviewer.ts";
import { createModel, reduce } from "../src/raptor/engine/model.ts";
import type { UnsequencedEvent } from "../src/raptor/engine/events.ts";

async function fixtureMap() {
  const dir = await mkdtemp(join(tmpdir(), "plan-"));
  await writeFile(join(dir, "ingest.py"), "obj = pickle.loads(body)\n");
  await writeFile(join(dir, "readme.md"), "# notes\n");
  const scope = resolveScope({ root: dir });
  const map = await mapRepo(scope);
  return { dir, map };
}

/** Run a scripted plan and assert its events replay through the real reducer. */
function assertNarrationReduces(events: UnsequencedEvent[]) {
  // The planner is a child of a primary agent, so stand one up first.
  const preamble: UnsequencedEvent[] = [
    { type: "session.reset" },
    { type: "conversation.opened" },
    { type: "agent.spawned", agentId: "raptor", parentId: null, label: "Raptor" },
    { type: "agent.state", agentId: "raptor", state: "running" },
  ];
  let model = createModel();
  let seq = 0;
  for (const e of [...preamble, ...events]) {
    const r = reduce(model, { ...e, seq: ++seq } as never);
    assert.ok(r.accepted, `reducer accepted ${e.type}`);
    model = r.model;
  }
}

test("the planner reviews the files it chooses and collects their findings", async () => {
  const { dir, map } = await fixtureMap();
  try {
    const events: UnsequencedEvent[] = [];
    const result = await runPlan({
      map,
      reviewer: patternReviewer(),
      planner: scriptedPlanner([
        { tool: "list" },
        { tool: "review", file: "ingest.py" },
        { tool: "finish", reason: "risky file reviewed" },
      ]),
      parentAgentId: "raptor",
      emit: (e) => events.push(e),
    });

    assert.deepEqual(result.reviewedFiles, ["ingest.py"]);
    assert.equal(result.findings.length, 1, "pickle.loads is flagged");
    assert.equal(result.findings[0].cwe, "CWE-502");
    assert.equal(result.steps.length, 3);
    assertNarrationReduces(events);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the search tool greps the in-scope files and is bounded to them", async () => {
  const { dir, map } = await fixtureMap();
  try {
    const result = await runPlan({
      map,
      reviewer: patternReviewer(),
      planner: scriptedPlanner([
        { tool: "search", pattern: "pickle\\.loads", glob: "**/*.py" },
        { tool: "search", pattern: "nothing-here" },
        { tool: "finish" },
      ]),
      parentAgentId: "raptor",
    });

    assert.match(result.steps[0].result, /ingest\.py:1:/, "finds the pickle line");
    assert.doesNotMatch(result.steps[0].result, /readme\.md/, "the glob excludes non-Python files");
    assert.match(result.steps[1].result, /no matches/);
    // Search reads but never reviews, so it raises no findings on its own.
    assert.equal(result.findings.length, 0);
    assert.equal(result.reviewedFiles.length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("an invalid regex in search is treated as a literal match", async () => {
  const { dir, map } = await fixtureMap();
  try {
    const result = await runPlan({
      map,
      reviewer: patternReviewer(),
      planner: scriptedPlanner([{ tool: "search", pattern: "loads(body" }, { tool: "finish" }]),
      parentAgentId: "raptor",
    });
    // "loads(body" is not valid regex; matched literally it still finds the line.
    assert.match(result.steps[0].result, /ingest\.py:1:/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the planner cannot read or review outside the in-scope file set", async () => {
  const { dir, map } = await fixtureMap();
  try {
    const result = await runPlan({
      map,
      reviewer: patternReviewer(),
      planner: scriptedPlanner([
        { tool: "read", file: "../../../etc/passwd" },
        { tool: "review", file: "/etc/hosts" },
        { tool: "finish" },
      ]),
      parentAgentId: "raptor",
    });

    // Both out-of-scope actions were refused and produced no findings.
    assert.equal(result.reviewedFiles.length, 0);
    assert.equal(result.findings.length, 0);
    assert.equal(result.steps[0].ok, false);
    assert.match(result.steps[0].result, /not an in-scope file/);
    assert.equal(result.steps[1].ok, false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("reviewing the same file twice is refused, and the step budget is enforced", async () => {
  const { dir, map } = await fixtureMap();
  try {
    const twice = await runPlan({
      map,
      reviewer: patternReviewer(),
      planner: scriptedPlanner([
        { tool: "review", file: "ingest.py" },
        { tool: "review", file: "ingest.py" },
        { tool: "finish" },
      ]),
      parentAgentId: "raptor",
    });
    assert.equal(twice.steps[1].ok, false, "second review of the same file is refused");
    assert.match(twice.steps[1].result, /already reviewed/);
    assert.equal(twice.findings.length, 1, "the finding is counted once");

    // A planner that never finishes stops at the step budget.
    const looping = await runPlan({
      map,
      reviewer: patternReviewer(),
      planner: scriptedPlanner([{ tool: "list" }, { tool: "list" }, { tool: "list" }, { tool: "list" }]),
      parentAgentId: "raptor",
      maxSteps: 3,
    });
    assert.equal(looping.steps.length, 3, "the loop halts at maxSteps");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("modelPlanner parses a JSON action and finishes on a bad reply", async () => {
  const replies = [
    'Let me review that file: {"tool":"review","file":"ingest.py"}',
    "I am not going to answer in JSON.",
  ];
  let i = 0;
  const transport: Transport = {
    model: "fake",
    async complete() {
      return replies[Math.min(i++, replies.length - 1)];
    },
  };
  const planner = modelPlanner({ transport });
  const state = { files: ["ingest.py"], reviewed: [], findingCount: 0, history: [], stepsLeft: 5 };

  const first = await planner.next(state);
  assert.deepEqual(first, { tool: "review", file: "ingest.py" } satisfies PlanAction);

  const second = await planner.next(state);
  assert.equal(second.tool, "finish", "an unparseable reply ends the run");
});

test("modelPlanner drives a real plan end to end with a fake transport", async () => {
  const { dir, map } = await fixtureMap();
  try {
    const script = [
      '{"tool":"list","glob":"**/*.py"}',
      '{"tool":"review","file":"ingest.py"}',
      '{"tool":"finish","reason":"done"}',
    ];
    let i = 0;
    const transport: Transport = {
      model: "fake",
      async complete() {
        return script[Math.min(i++, script.length - 1)];
      },
    };
    const result = await runPlan({
      map,
      reviewer: patternReviewer(),
      planner: modelPlanner({ transport }),
      parentAgentId: "raptor",
    });
    assert.equal(result.planner, "planner:fake");
    assert.deepEqual(result.reviewedFiles, ["ingest.py"]);
    assert.equal(result.findings.length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
