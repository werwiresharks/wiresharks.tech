import { test } from "node:test";
import assert from "node:assert/strict";
import { SessionLog } from "./log.ts";

test("append assigns strictly increasing sequence numbers", () => {
  const log = new SessionLog();
  const a = log.append({ type: "session.reset" });
  const b = log.append({ type: "agent.spawned", agentId: "raptor", parentId: null, label: "Raptor" });
  assert.equal(a?.seq, 1);
  assert.equal(b?.seq, 2);
  assert.equal(log.lastSeq, 2);
});

test("append rejects events the reducer would reject and leaves the log unchanged", () => {
  const log = new SessionLog();
  log.append({ type: "agent.spawned", agentId: "raptor", parentId: null, label: "Raptor" });
  // agent.state for an unknown agent is invalid.
  const bad = log.append({ type: "agent.state", agentId: "ghost", state: "running" });
  assert.equal(bad, null);
  assert.equal(log.lastSeq, 1, "a rejected append does not advance the sequence");
});

test("a fresh client catches up from the most recent session boundary", () => {
  const log = new SessionLog();
  log.append({ type: "session.reset" });
  log.append({ type: "agent.spawned", agentId: "raptor", parentId: null, label: "Raptor" });
  log.append({ type: "agent.state", agentId: "raptor", state: "running" });
  log.append({ type: "session.reset" }); // new cycle
  log.append({ type: "agent.spawned", agentId: "raptor", parentId: null, label: "Raptor" });

  const fresh = log.catchUp(null);
  assert.deepEqual(
    fresh.map((e) => e.seq),
    [4, 5],
    "replay starts at the last reset so it reduces from an empty model",
  );
});

test("a reconnecting client catches up only on what it missed", () => {
  const log = new SessionLog();
  log.append({ type: "session.reset" });
  log.append({ type: "agent.spawned", agentId: "raptor", parentId: null, label: "Raptor" });
  log.append({ type: "agent.state", agentId: "raptor", state: "running" });

  const missed = log.catchUp(2);
  assert.deepEqual(missed.map((e) => e.seq), [3]);
});

test("the ring buffer is bounded but the sequence keeps climbing", () => {
  const log = new SessionLog(3);
  for (let i = 0; i < 6; i++) log.append({ type: "session.reset" });
  assert.equal(log.lastSeq, 6);
  assert.ok(log.catchUp(0).length <= 3, "only the recent tail is retained");
});

test("subscribers receive each appended event", () => {
  const log = new SessionLog();
  const seen: number[] = [];
  const off = log.subscribe((e) => seen.push(e.seq));
  log.append({ type: "session.reset" });
  log.append({ type: "agent.spawned", agentId: "raptor", parentId: null, label: "Raptor" });
  off();
  log.append({ type: "agent.state", agentId: "raptor", state: "running" });
  assert.deepEqual(seen, [1, 2], "no events after unsubscribe");
});
