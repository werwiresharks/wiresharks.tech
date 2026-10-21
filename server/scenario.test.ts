import { test } from "node:test";
import assert from "node:assert/strict";
import { SessionLog } from "./log.ts";
import { REVIEW_SESSION, playScenario } from "./scenario.ts";

/** A controllable clock, so the scenario runs with no real time elapsed. */
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
  return { scheduler, advance, pending: () => queue.length };
}

test("every scenario event is valid and applies in order", () => {
  const log = new SessionLog();
  const { scheduler, advance } = fakeScheduler();
  const stop = playScenario(log, { scheduler, loop: false });
  advance(60_000);
  // All steps applied: the sequence equals the step count.
  assert.equal(log.lastSeq, REVIEW_SESSION.length);
  assert.equal(log.snapshot.agents.raptor?.state, "completed");
  stop();
});

test("the scenario loops, each cycle reopening with a reset", () => {
  const log = new SessionLog();
  const { scheduler, advance } = fakeScheduler();
  const restMs = 1000;
  const cycleMs = REVIEW_SESSION.reduce((sum, step) => sum + step.delayMs, 0);
  const stop = playScenario(log, { scheduler, loop: true, restMs });

  advance(cycleMs); // exactly one full cycle
  const afterFirst = log.lastSeq;
  assert.equal(afterFirst, REVIEW_SESSION.length);

  advance(restMs * 2 + cycleMs); // through the rest gap and into cycle two
  assert.ok(log.lastSeq > afterFirst, "a second cycle has begun");
  // A fresh client still gets a clean, reset-anchored replay.
  const fresh = log.catchUp(null);
  assert.equal(fresh[0]?.type, "session.reset");
  stop();
});

test("stop halts the scenario", () => {
  const log = new SessionLog();
  const { scheduler, advance, pending } = fakeScheduler();
  const stop = playScenario(log, { scheduler, loop: true });
  advance(2_000);
  const seq = log.lastSeq;
  stop();
  advance(60_000);
  assert.equal(log.lastSeq, seq, "no events after stop");
  assert.equal(pending(), 0);
});
