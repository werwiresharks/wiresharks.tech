import { test } from "node:test";
import assert from "node:assert/strict";
import { RaptorEngine } from "./engine.ts";
import { appendNarration } from "./narration.ts";
import { describeModel } from "./describe.ts";
import type { RaptorEvent } from "./events.ts";

/** Collect the narration an engine would voice, as a UI live region would. */
function narrate(events: RaptorEvent[], max?: number) {
  const engine = new RaptorEngine();
  let lines: string[] = [];
  engine.subscribe((_model, record) => {
    if (record) lines = appendNarration(lines, record, max);
  });
  for (const event of events) engine.ingest(event);
  return { lines, summary: describeModel(engine.model) };
}

test("appendNarration keeps accepted events and drops rejected ones", () => {
  const kept = appendNarration([], {
    event: { type: "session.reset", seq: 1 },
    accepted: true,
    description: "Session reset",
  });
  assert.deepEqual(kept, ["Session reset"]);

  const skipped = appendNarration(["Session reset"], {
    event: { type: "conversation.closed", seq: 2 },
    accepted: false,
    reason: "conversation not open",
    description: "Conversation closed",
  });
  assert.deepEqual(skipped, ["Session reset"], "rejected events are not announced");
});

test("appendNarration caps the log to the most recent lines", () => {
  let lines: string[] = [];
  for (let i = 1; i <= 20; i++) {
    lines = appendNarration(
      lines,
      { event: { type: "session.reset", seq: i }, accepted: true, description: `line ${i}` },
      5,
    );
  }
  assert.deepEqual(lines, ["line 16", "line 17", "line 18", "line 19", "line 20"]);
});

test("a real session voices each accepted event in plain language", () => {
  const { lines, summary } = narrate([
    { type: "agent.spawned", seq: 1, agentId: "raptor", parentId: null, label: "Raptor" },
    { type: "agent.state", seq: 2, agentId: "raptor", state: "running" },
    { type: "agent.spawned", seq: 3, agentId: "recon", parentId: "raptor", label: "Recon" },
    { type: "action.proposed", seq: 4, actionId: "x1", agentId: "recon", summary: "Open a pull request" },
    { type: "authorization.requested", seq: 5, actionId: "x1" },
    { type: "authorization.resolved", seq: 6, actionId: "x1", decision: "approved", authority: "policy layer" },
  ]);
  assert.deepEqual(lines, [
    "Raptor started",
    "Raptor running",
    "Recon spawned in parallel",
    "Recon proposed: Open a pull request",
    "x1 awaiting authority",
    "x1 approved by policy layer",
  ]);
  // The action was approved by the last event, so it is no longer held.
  assert.equal(summary, "Primary agent running, 1 parallel subagent.");
})

test("the summary reports actions held at the authority boundary", () => {
  const { summary } = narrate([
    { type: "agent.spawned", seq: 1, agentId: "raptor", parentId: null, label: "Raptor" },
    { type: "agent.state", seq: 2, agentId: "raptor", state: "running" },
    { type: "action.proposed", seq: 3, actionId: "x1", agentId: "raptor", summary: "Rotate the test credential" },
    { type: "authorization.requested", seq: 4, actionId: "x1" },
  ]);
  assert.equal(
    summary,
    "Primary agent running, 1 action held at the authority boundary.",
  );
});

test("an invalid event is neither applied nor announced", () => {
  const { lines, summary } = narrate([
    { type: "agent.spawned", seq: 1, agentId: "raptor", parentId: null, label: "Raptor" },
    // Out of order: stale seq, rejected by the reducer.
    { type: "agent.state", seq: 1, agentId: "raptor", state: "running" },
  ]);
  assert.deepEqual(lines, ["Raptor started"]);
  assert.equal(summary, "Primary agent idle.");
});
