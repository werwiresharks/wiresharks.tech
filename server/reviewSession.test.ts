import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { recordReview } from "./reviewSession.ts";
import { SessionLog } from "./log.ts";
import { playScenario } from "./scenario.ts";
import { compositeReviewer, modelReviewer } from "../raptor/src/modelReviewer.ts";
import { patternReviewer } from "../raptor/src/reviewer.ts";
import { modelPlanner } from "../raptor/src/plan.ts";
import type { Transport } from "../raptor/src/modelReviewer.ts";
import { createModel, reduce } from "../src/raptor/engine/model.ts";

/** A controllable clock, so a recorded review plays with no real time elapsed. */
function fakeScheduler() {
  const queue: { at: number; run: () => void; handle: object }[] = [];
  let now = 0;
  const scheduler = {
    set(run: () => void, ms: number) {
      const handle = {};
      queue.push({ at: now + ms, run, handle });
      return handle;
    },
    clear(handle: unknown) {
      const i = queue.findIndex((e) => e.handle === handle);
      if (i >= 0) queue.splice(i, 1);
    },
  };
  const advance = (ms: number) => {
    const end = now + ms;
    for (;;) {
      queue.sort((a, b) => a.at - b.at);
      if (!queue[0] || queue[0].at > end) break;
      const next = queue.shift()!;
      now = next.at;
      next.run();
    }
    now = end;
  };
  return { scheduler, advance };
}

/** Replay recorded steps through the real engine reducer, asserting it accepts each. */
function assertReducible(steps: { event: unknown }[]) {
  let model = createModel();
  let seq = 0;
  for (const step of steps) {
    const result = reduce(model, { ...(step.event as object), seq: ++seq } as never);
    assert.ok(result.accepted, `reducer accepted event ${seq}`);
    model = result.model;
  }
}

test("recordReview captures a real review as a reducible, self-contained session", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rec-"));
  try {
    await writeFile(join(dir, "ingest.py"), "obj = pickle.loads(body)\n");
    await writeFile(join(dir, "safe.py"), "x = json.loads(body)\n");
    const steps = await recordReview({ root: dir });

    assert.ok(steps.length > 0, "the review narrated events");
    assert.equal(steps[0].event.type, "session.reset", "opens on a reset boundary");
    assert.equal(steps[0].delayMs, 0, "the reset fires immediately");
    assert.equal(steps.at(-1)?.event.type, "conversation.closed", "closes cleanly");
    assert.ok(
      steps.some((s) => s.event.type === "action.proposed"),
      "a real finding was narrated",
    );
    assertReducible(steps);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a recorded review plays into a session log, every event accepted", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rec-"));
  try {
    await writeFile(join(dir, "client.py"), "requests.get(u, verify=False)\n");
    const steps = await recordReview({ root: dir });

    const log = new SessionLog();
    const { scheduler, advance } = fakeScheduler();
    const stop = playScenario(log, { steps, scheduler, loop: false });
    advance(60_000);
    stop();

    // The log assigns seqs through its own reducer; no event was rejected.
    assert.equal(log.lastSeq, steps.length);
    assert.equal(log.snapshot.agents.raptor?.state, "completed");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the recorder accepts a model-driven reviewer and planner, offline", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rec-"));
  try {
    await writeFile(join(dir, "ingest.py"), "obj = pickle.loads(body)\n");

    // A fake transport stands in for the model: the planner lists, reviews, then
    // finishes; the reviewer reports one finding. No network, no key.
    const plan = ['{"tool":"review","file":"ingest.py"}', '{"tool":"finish"}'];
    let i = 0;
    const plannerTransport: Transport = { model: "fake", async complete() { return plan[Math.min(i++, plan.length - 1)]; } };
    const reviewerTransport: Transport = {
      model: "fake",
      async complete() {
        return JSON.stringify([{ line: 1, cwe: "CWE-502", severity: "high", title: "Unsafe deserialization" }]);
      },
    };

    const steps = await recordReview({
      root: dir,
      reviewer: compositeReviewer([patternReviewer(), modelReviewer({ transport: reviewerTransport })]),
      planner: modelPlanner({ transport: plannerTransport }),
    });

    assert.equal(steps[0].event.type, "session.reset");
    assert.equal(steps.at(-1)?.event.type, "conversation.closed");
    assert.ok(steps.some((s) => s.event.type === "action.proposed"), "the review narrated a finding");
    assertReducible(steps);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the bundled demo target reviews into a live session", async () => {
  const target = fileURLToPath(new URL("./demo/review-target/", import.meta.url));
  const steps = await recordReview({ root: target });

  // The sample repo trips several rules and runs the Prove step to the report.
  const proposed = steps.filter((s) => s.event.type === "action.proposed");
  assert.ok(proposed.length >= 3, "the sample repo raises multiple leads");
  assert.ok(
    steps.some((s) => s.event.type === "authorization.resolved"),
    "an action is authorized before it executes",
  );
  assertReducible(steps);
});
