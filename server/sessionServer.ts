import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { RaptorEvent } from "../src/raptor/engine/events.ts";
import { describeModel } from "../src/raptor/engine/describe.ts";
import type { SessionLog } from "./log.ts";
import type { WaitlistStore } from "./store.ts";
import { isValidEmail } from "./store.ts";

/**
 * An HTTP server that streams a session's validated events to the browser over
 * Server-Sent Events. SSE is a natural fit: the stream is one-directional and
 * resumes natively — the browser resends `Last-Event-ID` on reconnect, and the
 * log replays exactly what was missed. The server only reports events; like the
 * engine, it makes no authorization decisions.
 *
 * Routes:
 *   GET  /events    SSE stream (honours `Last-Event-ID` or `?since=`)
 *   GET  /health    JSON status
 *   POST /waitlist  join the waitlist (when a store is provided)
 *   GET  /          plain-text usage
 */
export type SessionServerOptions = {
  log: SessionLog;
  /** Allowed CORS origin for browsers. Defaults to any origin. */
  origin?: string;
  /** Heartbeat comment interval in ms, to keep proxies from idling the stream. */
  heartbeatMs?: number;
  /** When set, enables POST /waitlist backed by this store. */
  waitlist?: WaitlistStore;
};

const MAX_BODY_BYTES = 4096;

/** Read a capped JSON request body, or reject oversize/invalid input. */
function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8") || "{}";
        const value = JSON.parse(text);
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          reject(new Error("not an object"));
          return;
        }
        resolve(value as Record<string, unknown>);
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

function sseMessage(event: RaptorEvent): string {
  return `id: ${event.seq}\nevent: raptor\ndata: ${JSON.stringify(event)}\n\n`;
}

function parseLastEventId(req: IncomingMessage, url: URL): number | null {
  const header = req.headers["last-event-id"];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  const raw = fromHeader ?? url.searchParams.get("since") ?? undefined;
  if (raw === undefined) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

export function createSessionServer(options: SessionServerOptions): Server {
  const { log } = options;
  const origin = options.origin ?? "*";
  const heartbeatMs = options.heartbeatMs ?? 15000;

  const cors = (res: ServerResponse) => {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  };

  const sendJson = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
  };

  return createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    cors(res);

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Last-Event-ID",
        "Access-Control-Max-Age": "86400",
      }).end();
      return;
    }

    if (req.method === "POST" && url.pathname === "/waitlist") {
      if (!options.waitlist) {
        sendJson(res, 404, { error: "waitlist not enabled" });
        return;
      }
      readJsonBody(req)
        .then(async (body) => {
          const email = typeof body.email === "string" ? body.email.trim() : "";
          const source = typeof body.source === "string" ? body.source.slice(0, 64) : undefined;
          if (!isValidEmail(email)) {
            sendJson(res, 400, { error: "a valid email is required" });
            return;
          }
          const result = await options.waitlist!.add(email, source);
          sendJson(res, result === "added" ? 201 : 200, { status: result });
        })
        .catch((err: Error) => {
          const tooLarge = err.message === "too large";
          sendJson(res, tooLarge ? 413 : 400, { error: tooLarge ? "body too large" : "invalid request body" });
        });
      return;
    }

    if (req.method !== "GET") {
      res.writeHead(405, { "Content-Type": "text/plain" }).end("Method Not Allowed");
      return;
    }

    if (url.pathname === "/health") {
      const model = log.snapshot;
      const body = JSON.stringify({
        ok: true,
        lastSeq: log.lastSeq,
        agents: Object.keys(model.agents).length,
        summary: describeModel(model),
      });
      res.writeHead(200, { "Content-Type": "application/json" }).end(body);
      return;
    }

    if (url.pathname === "/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });
      // Advise the client's retry backoff, then replay the missed tail.
      res.write("retry: 2000\n\n");
      for (const event of log.catchUp(parseLastEventId(req, url))) {
        res.write(sseMessage(event));
      }
      const unsubscribe = log.subscribe((event) => res.write(sseMessage(event)));
      const heartbeat = setInterval(() => res.write(": ping\n\n"), heartbeatMs);
      const close = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
      req.on("close", close);
      res.on("close", close);
      return;
    }

    if (url.pathname === "/") {
      const lines = ["Raptor session stream.", "GET /events (SSE)", "GET /health"];
      if (options.waitlist) lines.push("POST /waitlist {email}");
      res.writeHead(200, { "Content-Type": "text/plain" }).end(lines.join("\n") + "\n");
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not Found");
  });
}
