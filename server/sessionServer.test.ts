import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { SessionLog } from "./log.ts";
import { createSessionServer } from "./sessionServer.ts";

function listen(log: SessionLog): Promise<{ port: number; close: () => Promise<void> }> {
  const server = createSessionServer({ log });
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
