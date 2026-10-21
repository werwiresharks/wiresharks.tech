import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEvent, parseMessage } from "./wire.ts";
import {
  createStreamSource,
  type StreamConnection,
  type StreamHandlers,
  type StreamTransport,
} from "./stream.ts";
import { connect } from "./source.ts";
import { RaptorEngine } from "../engine/engine.ts";
import { rootAgent } from "../engine/model.ts";

// --- wire.ts ---------------------------------------------------------------

test("parseEvent accepts a well-formed event and preserves optional at", () => {
  const event = parseEvent({
    type: "agent.spawned",
    seq: 3,
    at: 1000,
    agentId: "a1",
    parentId: null,
    label: "Recon",
  });
  assert.deepEqual(event, {
    type: "agent.spawned",
    seq: 3,
    at: 1000,
    agentId: "a1",
    parentId: null,
    label: "Recon",
  });
});

test("parseEvent rejects malformed, partial, and hostile input", () => {
  for (const bad of [
    null,
    42,
    "agent.spawned",
    [],
    { type: "nope", seq: 1 },
    { type: "agent.spawned", seq: 1, parentId: null, label: "x" }, // no agentId
    { type: "agent.spawned", seq: 1, agentId: "a1", label: "x" }, // parentId missing
    { type: "agent.state", seq: 1, agentId: "a1", state: "sprinting" }, // bad enum
    { type: "authorization.resolved", seq: 1, actionId: "x", decision: "maybe", authority: "p" },
    { type: "agent.spawned", seq: 1.5, agentId: "a1", parentId: null, label: "x" }, // non-int seq
    { type: "agent.spawned", seq: -1, agentId: "a1", parentId: null, label: "x" }, // negative
    { type: "session.reset", seq: Number.NaN },
    { type: "session.reset", seq: 1, at: "soon" }, // bad at
  ]) {
    assert.equal(parseEvent(bad), null, `should reject ${JSON.stringify(bad)}`);
  }
});

test("parseEvent accepts an explicit parentId string", () => {
  const event = parseEvent({
    type: "agent.spawned",
    seq: 1,
    agentId: "a2",
    parentId: "a1",
    label: "Dependency audit",
  });
  assert.equal(event?.type === "agent.spawned" && event.parentId, "a1");
});

test("parseMessage decodes JSON strings and swallows decode errors", () => {
  assert.equal(parseMessage("{bad json").length, 0);
  const [event] = parseMessage(JSON.stringify({ type: "session.reset", seq: 0 }));
  assert.equal(event?.type, "session.reset");
});

// --- stream.ts -------------------------------------------------------------

type Attempt = { handlers: StreamHandlers; connection: StreamConnection; closed: boolean };

function fakeTransport() {
  const attempts: Attempt[] = [];
  const transport: StreamTransport = {
    connect(handlers) {
      const attempt: Attempt = {
        handlers,
        closed: false,
        connection: { close: () => void (attempt.closed = true) },
      };
      attempts.push(attempt);
      return attempt.connection;
    },
  };
  return { transport, attempts };
}

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

function spawn(seq: number, agentId: string) {
  return { type: "agent.spawned", seq, agentId, parentId: null, label: "Primary" };
}

test("stream forwards validated events to listeners", () => {
  const { transport, attempts } = fakeTransport();
  const source = createStreamSource(transport);
  const seen: string[] = [];
  source.subscribe((e) => seen.push(e.type));
  attempts[0].handlers.onOpen();
  attempts[0].handlers.onMessage(spawn(0, "a1"));
  attempts[0].handlers.onMessage({ type: "agent.state", seq: 1, agentId: "a1", state: "running" });
  assert.deepEqual(seen, ["agent.spawned", "agent.state"]);
  source.close();
});

test("stream drops stale and duplicate sequence numbers", () => {
  const { transport, attempts } = fakeTransport();
  const source = createStreamSource(transport);
  const seqs: number[] = [];
  source.subscribe((e) => seqs.push(e.seq));
  const h = attempts[0].handlers;
  h.onOpen();
  h.onMessage(spawn(0, "a1"));
  h.onMessage(spawn(0, "a1")); // duplicate replay
  h.onMessage({ type: "agent.state", seq: 1, agentId: "a1", state: "running" });
  h.onMessage({ type: "agent.state", seq: 1, agentId: "a1", state: "awaiting" }); // stale
  assert.deepEqual(seqs, [0, 1]);
  source.close();
});

test("stream reports invalid messages and does not forward them", () => {
  const { transport, attempts } = fakeTransport();
  const invalid: unknown[] = [];
  const source = createStreamSource(transport, { onInvalid: (d) => invalid.push(d) });
  const seen: unknown[] = [];
  source.subscribe((e) => seen.push(e));
  attempts[0].handlers.onMessage({ type: "garbage" });
  assert.equal(seen.length, 0);
  assert.equal(invalid.length, 1);
  source.close();
});

test("stream reconnects with doubling backoff", () => {
  const { transport, attempts } = fakeTransport();
  const { scheduler, advance } = fakeScheduler();
  const source = createStreamSource(transport, { scheduler, backoffMs: 500 });
  source.subscribe(() => {});
  assert.equal(attempts.length, 1);

  // First failure: 500ms backoff.
  attempts[0].handlers.onClose();
  advance(499);
  assert.equal(attempts.length, 1, "waits the full backoff before retrying");
  advance(1);
  assert.equal(attempts.length, 2, "reconnects after 500ms");

  // Second consecutive failure doubles the delay to 1000ms.
  attempts[1].handlers.onClose();
  advance(999);
  assert.equal(attempts.length, 2);
  advance(1);
  assert.equal(attempts.length, 3, "reconnects after 1000ms");
  source.close();
});

test("onReopen fires on a reconnect's open, never the first open", () => {
  const { transport, attempts } = fakeTransport();
  const { scheduler, advance } = fakeScheduler();
  let reopens = 0;
  const source = createStreamSource(transport, {
    scheduler,
    backoffMs: 100,
    onReopen: () => reopens++,
  });
  source.subscribe(() => {});
  attempts[0].handlers.onOpen(); // first open: no resync
  assert.equal(reopens, 0);
  attempts[0].handlers.onClose();
  advance(100);
  attempts[1].handlers.onOpen(); // reconnected: resync
  assert.equal(reopens, 1);
  source.close();
});

test("stream stops retrying after maxRetries consecutive failures", () => {
  const { transport, attempts } = fakeTransport();
  const { scheduler, advance, pending } = fakeScheduler();
  const source = createStreamSource(transport, { scheduler, backoffMs: 100, maxRetries: 2 });
  source.subscribe(() => {});
  // Never opens successfully, so backoff never resets.
  for (let i = 0; i < 5; i++) {
    attempts[attempts.length - 1].handlers.onClose();
    advance(100_000);
  }
  assert.equal(attempts.length, 3, "one initial + two retries");
  assert.equal(pending(), 0);
  source.close();
});

test("a successful open resets the retry budget", () => {
  const { transport, attempts } = fakeTransport();
  const { scheduler, advance } = fakeScheduler();
  const source = createStreamSource(transport, { scheduler, backoffMs: 100, maxRetries: 1 });
  source.subscribe(() => {});
  attempts[0].handlers.onClose(); // retry 1
  advance(100_000);
  attempts[1].handlers.onOpen(); // success resets the budget
  attempts[1].handlers.onClose(); // retry allowed again
  advance(100_000);
  assert.equal(attempts.length, 3, "budget reset let it retry again");
  source.close();
});

test("unsubscribing the last listener closes a live connection", () => {
  const { transport, attempts } = fakeTransport();
  const source = createStreamSource(transport);
  const off = source.subscribe(() => {});
  attempts[0].handlers.onOpen();
  off();
  assert.equal(attempts[0].closed, true);
});

test("unsubscribing cancels a pending reconnect", () => {
  const { transport, attempts } = fakeTransport();
  const { scheduler, pending } = fakeScheduler();
  const source = createStreamSource(transport, { scheduler, backoffMs: 100 });
  const off = source.subscribe(() => {});
  attempts[0].handlers.onClose(); // schedules a retry
  assert.equal(pending(), 1);
  off();
  assert.equal(pending(), 0, "pending retry cancelled");
});

test("close() refuses further reconnects", () => {
  const { transport, attempts } = fakeTransport();
  const { scheduler, advance } = fakeScheduler();
  const source = createStreamSource(transport, { scheduler, backoffMs: 100 });
  source.subscribe(() => {});
  source.close();
  attempts[0].handlers.onClose();
  advance(100_000);
  assert.equal(attempts.length, 1);
});

// --- end to end ------------------------------------------------------------

test("a stream drives a real engine through the adapter seam", () => {
  const { transport, attempts } = fakeTransport();
  const source = createStreamSource(transport);
  const engine = new RaptorEngine();
  const disconnect = connect(engine, source);

  // The engine starts at seq 0 and rejects any event with seq <= its own, so
  // a live runtime's first event is seq 1.
  const h = attempts[0].handlers;
  h.onOpen();
  h.onMessage(spawn(1, "a1"));
  h.onMessage({ type: "agent.state", seq: 2, agentId: "a1", state: "running" });

  const root = rootAgent(engine.model);
  assert.equal(root?.id, "a1");
  assert.equal(root?.state, "running");

  disconnect();
  source.close();
});
