import { test } from "node:test";
import assert from "node:assert/strict";
import { runScheduled } from "./scheduler.ts";
import type { ScheduledJob } from "./scheduler.ts";

const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

test("runScheduled holds concurrency to the limit and completes every job", async () => {
  let running = 0;
  let peak = 0;
  const jobs: ScheduledJob<number>[] = Array.from({ length: 6 }, (_, i) => ({
    id: `j${i}`,
    async run() {
      running += 1;
      peak = Math.max(peak, running);
      await tick();
      running -= 1;
      return i;
    },
  }));

  const outcomes = await runScheduled(jobs, { concurrency: 2 });
  assert.equal(outcomes.length, 6);
  assert.ok(outcomes.every((o) => o.status === "completed"), "all jobs completed");
  assert.deepEqual(outcomes.map((o) => o.value), [0, 1, 2, 3, 4, 5]);
  assert.ok(peak <= 2, `never exceeded concurrency (peak ${peak})`);
});

test("one failing job is isolated: the rest still complete", async () => {
  const jobs: ScheduledJob<string>[] = [
    { id: "ok1", async run() { return "a"; } },
    { id: "boom", async run() { throw new Error("worker crashed"); } },
    { id: "ok2", async run() { return "b"; } },
  ];
  const outcomes = await runScheduled(jobs, { concurrency: 3 });
  assert.deepEqual(outcomes.map((o) => o.status), ["completed", "failed", "completed"]);
  assert.equal(outcomes[1].error, "worker crashed");
  assert.equal(outcomes[0].value, "a");
});

test("an aborted assessment cancels pending jobs and the one in flight", async () => {
  const ac = new AbortController();
  const order: string[] = [];
  const jobs: ScheduledJob<string>[] = [
    {
      id: "first",
      async run(signal) {
        order.push("first-start");
        ac.abort(); // cancel the assessment as soon as the first job starts
        await new Promise<void>((_, reject) =>
          signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }),
        );
        return "never";
      },
    },
    { id: "second", async run() { order.push("second-start"); return "b"; } },
    { id: "third", async run() { order.push("third-start"); return "c"; } },
  ];

  const outcomes = await runScheduled(jobs, { concurrency: 1, signal: ac.signal });
  assert.equal(outcomes[0].status, "cancelled", "the in-flight job was cancelled");
  assert.equal(outcomes[1].status, "cancelled", "a pending job was cancelled, not run");
  assert.equal(outcomes[2].status, "cancelled");
  assert.deepEqual(order, ["first-start"], "pending jobs never started");
});

test("a job that overruns its budget is timed out", async () => {
  const activity: string[] = [];
  const jobs: ScheduledJob<string>[] = [
    {
      id: "slow",
      run(signal) {
        return new Promise<string>((resolve, reject) => {
          const t = setTimeout(() => resolve("too late"), 1000);
          signal.addEventListener("abort", () => { clearTimeout(t); reject(new Error("aborted")); }, { once: true });
        });
      },
    },
  ];
  const outcomes = await runScheduled(jobs, { timeoutMs: 20, onActivity: (e) => activity.push(e.event) });
  assert.equal(outcomes[0].status, "timed-out");
  assert.ok(activity.includes("started") && activity.includes("timed-out"), "activity log recorded the lifecycle");
});
