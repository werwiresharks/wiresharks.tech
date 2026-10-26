import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { SessionLog } from "./log.ts";
import { createSessionServer } from "./sessionServer.ts";
import { createMemoryWaitlist } from "./store.ts";
import type { WaitlistStore } from "./store.ts";

function listen(
  log: SessionLog,
  waitlist?: WaitlistStore,
): Promise<{ port: number; close: () => Promise<void> }> {
  const server = createSessionServer({ log, waitlist });
  return new Promise((resolve) => {
    server.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        port,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

/** Parse the `data:` lines of an SSE chunk into events. */
function parseSse(buffer: string): { type: string; seq: number }[] {
  const events: { type: string; seq: number }[] = [];
  for (const line of buffer.split("\n")) {
    if (line.startsWith("data: ")) events.push(JSON.parse(line.slice(6)));
  }
  return events;
}

test("GET /health reports the current session state", async () => {
  const log = new SessionLog();
  log.append({ type: "session.reset" });
  log.append({ type: "agent.spawned", agentId: "raptor", parentId: null, label: "Raptor" });
  const server = await listen(log);

  const res = await fetch(`http://localhost:${server.port}/health`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.lastSeq, 2);
  assert.equal(body.agents, 1);

  await server.close();
});

test("GET /events replays the tail then streams live events", async () => {
  const log = new SessionLog();
  log.append({ type: "session.reset" });
  log.append({ type: "agent.spawned", agentId: "raptor", parentId: null, label: "Raptor" });
  const server = await listen(log);

  const seen: { type: string; seq: number }[] = [];
  let pushedLive = false;

  await new Promise<void>((resolve, reject) => {
    const req = http.get(
      { host: "localhost", port: server.port, path: "/events?since=0" },
      (res) => {
        assert.equal(res.headers["content-type"], "text/event-stream");
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => {
          for (const event of parseSse(chunk)) {
            seen.push(event);
            // Once the replay has arrived, push a live event through the log.
            if (seen.length === 2 && !pushedLive) {
              pushedLive = true;
              log.append({ type: "agent.state", agentId: "raptor", state: "running" });
            }
            if (seen.length === 3) {
              req.destroy();
              resolve();
            }
          }
        });
        res.on("error", () => {}); // destroy() surfaces here; ignore
      },
    );
    req.on("error", (err) => {
      if (!pushedLive || seen.length < 3) reject(err);
    });
    setTimeout(() => reject(new Error("timed out waiting for SSE events")), 5000);
  });

  assert.deepEqual(
    seen.map((e) => e.seq),
    [1, 2, 3],
    "replayed seq 1-2 then the live seq 3",
  );
  assert.equal(seen[2].type, "agent.state");

  await server.close();
});

test("a reconnecting client only receives events after its Last-Event-ID", async () => {
  const log = new SessionLog();
  log.append({ type: "session.reset" });
  log.append({ type: "agent.spawned", agentId: "raptor", parentId: null, label: "Raptor" });
  log.append({ type: "agent.state", agentId: "raptor", state: "running" });
  const server = await listen(log);

  const seen: { type: string; seq: number }[] = [];
  await new Promise<void>((resolve, reject) => {
    const req = http.get(
      { host: "localhost", port: server.port, path: "/events", headers: { "Last-Event-ID": "2" } },
      (res) => {
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => {
          for (const event of parseSse(chunk)) {
            seen.push(event);
            req.destroy();
            resolve();
          }
        });
        res.on("error", () => {});
      },
    );
    req.on("error", (err) => {
      if (seen.length === 0) reject(err);
    });
    setTimeout(() => reject(new Error("timed out")), 5000);
  });

  assert.deepEqual(seen.map((e) => e.seq), [3], "only the missed event replays");
  await server.close();
});

test("POST /waitlist adds a valid email once and reports duplicates", async () => {
  const server = await listen(new SessionLog(), createMemoryWaitlist());
  const post = (body: unknown) =>
    fetch(`http://localhost:${server.port}/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const added = await post({ email: "sid@wiresharks.tech", source: "home" });
  assert.equal(added.status, 201);
  assert.deepEqual(await added.json(), { status: "added" });

  const dup = await post({ email: "SID@wiresharks.tech" });
  assert.equal(dup.status, 200);
  assert.deepEqual(await dup.json(), { status: "duplicate" });

  const bad = await post({ email: "not-an-email" });
  assert.equal(bad.status, 400);

  await server.close();
});

test("CORS preflight is answered for the waitlist", async () => {
  const server = await listen(new SessionLog(), createMemoryWaitlist());
  const res = await fetch(`http://localhost:${server.port}/waitlist`, { method: "OPTIONS" });
  assert.equal(res.status, 204);
  assert.ok(res.headers.get("access-control-allow-methods")?.includes("POST"));
  await server.close();
});

test("POST /waitlist is 404 when no store is configured", async () => {
  const server = await listen(new SessionLog());
  const res = await fetch(`http://localhost:${server.port}/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "a@b.co" }),
  });
  assert.equal(res.status, 404);
  await server.close();
});

test("POST /waitlist rejects invalid JSON and non-object bodies without persisting", async () => {
  const store = createMemoryWaitlist();
  const server = await listen(new SessionLog(), store);
  try {
    for (const body of ["{", "null", "[]", "42", '"hello"']) {
      const res = await fetch(`http://localhost:${server.port}/waitlist`, {
        method: "POST",
        body,
      });
      assert.equal(res.status, 400, body);
      assert.deepEqual(await res.json(), { error: "invalid request body" });
    }
    assert.equal(await store.count(), 0);
  } finally {
    await server.close();
  }
});

test("POST /waitlist distinguishes storage failures from bad requests and can recover", async () => {
  const store = createMemoryWaitlist();
  let fail = true;
  const server = await listen(new SessionLog(), {
    count: () => store.count(),
    add: (email, source) => {
      // Error text must not accidentally classify a storage failure as a 413.
      if (fail) throw new Error("too large");
      return store.add(email, source);
    },
  });
  const post = () => fetch(`http://localhost:${server.port}/waitlist`, {
    method: "POST",
    body: JSON.stringify({ email: "a@b.co" }),
  });
  try {
    const failed = await post();
    assert.equal(failed.status, 500);
    assert.deepEqual(await failed.json(), { error: "could not save waitlist entry" });
    assert.equal(await store.count(), 0);

    fail = false;
    const recovered = await post();
    assert.equal(recovered.status, 201);
    assert.deepEqual(await recovered.json(), { status: "added" });
    assert.equal(await store.count(), 1);
  } finally {
    await server.close();
  }
});

test("POST /waitlist accepts 4096 bytes and returns JSON 413 above that limit", async () => {
  const store = createMemoryWaitlist();
  const server = await listen(new SessionLog(), store);
  const base = JSON.stringify({ email: "a@b.co", source: "" });
  const boundary = JSON.stringify({ email: "a@b.co", source: "x".repeat(4096 - Buffer.byteLength(base)) });
  try {
    assert.equal(Buffer.byteLength(boundary), 4096);
    const accepted = await fetch(`http://localhost:${server.port}/waitlist`, {
      method: "POST", body: boundary,
    });
    assert.equal(accepted.status, 201);
    await accepted.json();

    for (const body of [boundary + " ", JSON.stringify({ email: "c@d.co", source: "é".repeat(3000) })]) {
      const rejected = await fetch(`http://localhost:${server.port}/waitlist`, {
        method: "POST", body,
      });
      assert.equal(rejected.status, 413);
      assert.deepEqual(await rejected.json(), { error: "body too large" });
      assert.equal(rejected.headers.get("access-control-allow-origin"), "*");
    }
    assert.equal(await store.count(), 1);
    const healthy = await fetch(`http://localhost:${server.port}/health`);
    assert.equal(healthy.status, 200);
    await healthy.json();
  } finally {
    await server.close();
  }
});

test("POST /waitlist rejects oversized chunked uploads without resetting the socket", async () => {
  const store = createMemoryWaitlist();
  const server = await listen(new SessionLog(), store);
  try {
    const response = await new Promise<{ status: number | undefined; body: string }>((resolve, reject) => {
      const req = http.request({ host: "localhost", port: server.port, path: "/waitlist", method: "POST" }, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => { body += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, body }));
        res.on("error", reject);
      });
      req.on("error", reject);
      req.write('{"email":"a@b.co","source":"');
      req.write("x".repeat(4096));
      req.end('"}');
    });
    assert.equal(response.status, 413);
    assert.deepEqual(JSON.parse(response.body), { error: "body too large" });
    assert.equal(await store.count(), 0);
  } finally {
    await server.close();
  }
});

test("shutdown ends live SSE streams and removes their subscriptions", { timeout: 5000 }, async () => {
  const log = new SessionLog();
  const subscribe = log.subscribe.bind(log);
  let subscriptions = 0;
  log.subscribe = (listener) => {
    subscriptions += 1;
    const unsubscribe = subscribe(listener);
    let active = true;
    return () => {
      if (active) subscriptions -= 1;
      active = false;
      unsubscribe();
    };
  };
  const server = createSessionServer({ log, heartbeatMs: 10 });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  const clients: http.ClientRequest[] = [];
  try {
    const ended = await Promise.all(Array.from({ length: 2 }, () =>
      new Promise<{ ended: Promise<void> }>((resolve, reject) => {
        const req = http.get({ host: "localhost", port, path: "/events" }, (res) => {
          assert.equal(res.statusCode, 200);
          const end = new Promise<void>((done, fail) => {
            res.on("end", done);
            res.on("error", fail);
          });
          res.once("data", () => resolve({ ended: end }));
          res.resume();
        });
        req.on("error", reject);
        clients.push(req);
      }),
    ));
    assert.equal(subscriptions, 2);
    await new Promise<void>((resolve, reject) => {
      server.shutdown((error) => error ? reject(error) : resolve());
    });
    await Promise.all(ended.map((client) => client.ended));
    assert.equal(subscriptions, 0);
  } finally {
    for (const req of clients) req.destroy();
    server.closeAllConnections();
    server.close();
  }
});

test("shutdown waits for an in-flight waitlist write rather than dropping it", { timeout: 5000 }, async () => {
  const store = createMemoryWaitlist();
  let started!: () => void;
  const writing = new Promise<void>((resolve) => { started = resolve; });
  let release!: () => void;
  const continueWrite = new Promise<void>((resolve) => { release = resolve; });
  const server = createSessionServer({
    log: new SessionLog(),
    waitlist: {
      count: () => store.count(),
      async add(email, source) {
        started();
        await continueWrite;
        return store.add(email, source);
      },
    },
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  try {
    const response = fetch(`http://localhost:${port}/waitlist`, {
      method: "POST", body: JSON.stringify({ email: "a@b.co" }),
    });
    await writing;
    let closed = false;
    const stopped = new Promise<void>((resolve, reject) => {
      server.shutdown((error) => {
        closed = true;
        if (error) reject(error);
        else resolve();
      });
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(closed, false, "an accepted write is still in progress");
    release();
    const res = await response;
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { status: "added" });
    await stopped;
    assert.equal(await store.count(), 1);
  } finally {
    release();
    server.closeAllConnections();
    server.close();
  }
});

test("repeated shutdown waits for a write even after its client disconnects", { timeout: 5000 }, async () => {
  const store = createMemoryWaitlist();
  let started!: () => void;
  const writing = new Promise<void>((resolve) => { started = resolve; });
  let release!: () => void;
  const continueWrite = new Promise<void>((resolve) => { release = resolve; });
  const server = createSessionServer({
    log: new SessionLog(),
    waitlist: {
      count: () => store.count(),
      async add(email, source) {
        started();
        await continueWrite;
        return store.add(email, source);
      },
    },
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  const req = http.request({ host: "localhost", port, path: "/waitlist", method: "POST" });
  req.on("error", () => {}); // Intentional disconnect while the write is pending.
  req.end(JSON.stringify({ email: "a@b.co" }));
  try {
    await writing;
    const disconnected = new Promise<void>((resolve) => req.once("close", resolve));
    req.destroy();
    await disconnected;
    let completed = 0;
    const stop = () => new Promise<Error | undefined>((resolve) => {
      server.shutdown((error) => {
        completed += 1;
        resolve(error);
      });
    });
    const first = stop();
    const repeated = stop();
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(completed, 0, "disconnecting does not cancel an accepted write");
    release();
    assert.deepEqual(await Promise.all([first, repeated]), [undefined, undefined]);
    assert.equal(await store.count(), 1);
  } finally {
    release();
    req.destroy();
    server.closeAllConnections();
    server.close();
  }
});
