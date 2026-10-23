import { test } from "node:test";
import assert from "node:assert/strict";
import {
  modelReviewer,
  anthropicTransport,
  compositeReviewer,
} from "./modelReviewer.ts";
import { patternReviewer } from "./reviewer.ts";
import type { Transport } from "./modelReviewer.ts";
import type { Finding } from "./findings.ts";

/** A transport that returns a fixed reply and records what it was asked. */
function fakeTransport(reply: string): Transport & { seen: { system: string; user: string }[] } {
  const seen: { system: string; user: string }[] = [];
  return {
    model: "fake-model",
    seen,
    async complete(input) {
      seen.push(input);
      return reply;
    },
  };
}

const CONTENT = "import pickle\nobj = pickle.loads(body)\nprint(obj)\n";

test("parses model findings and takes evidence from the real source line", async () => {
  const transport = fakeTransport(
    JSON.stringify([
      { line: 2, cwe: "cwe-502", severity: "high", title: "Unsafe deserialization" },
    ]),
  );
  const found = (await modelReviewer({ transport }).review({
    relPath: "ingest.py",
    content: CONTENT,
  })) as Finding[];

  assert.equal(found.length, 1);
  assert.equal(found[0].file, "ingest.py");
  assert.equal(found[0].line, 2);
  assert.equal(found[0].cwe, "CWE-502", "cwe is normalized to upper-case");
  assert.equal(found[0].severity, "high");
  assert.equal(found[0].status, "open");
  // Evidence is the real line 2, not anything the model could have supplied.
  assert.equal(found[0].evidence, "obj = pickle.loads(body)");
  // The file reached the model with numbered lines.
  assert.match(transport.seen[0].user, /ingest\.py/);
  assert.match(transport.seen[0].user, /2: obj = pickle\.loads\(body\)/);
});

test("drops hallucinated line numbers, bad items, and defaults a bad severity", async () => {
  const transport = fakeTransport(
    JSON.stringify([
      { line: 999, cwe: "CWE-95", severity: "high", title: "Out of range" },
      { line: 1, cwe: null, severity: "banana", title: "Bad severity defaults to medium" },
      { line: 2, severity: "low", title: "" }, // empty title is unusable
      { severity: "low", title: "No line" }, // no line
      "not an object",
    ]),
  );
  const found = (await modelReviewer({ transport }).review({
    relPath: "x.py",
    content: CONTENT,
  })) as Finding[];

  assert.equal(found.length, 1, "only the in-range, titled item survives");
  assert.equal(found[0].line, 1);
  assert.equal(found[0].severity, "medium");
  assert.equal(found[0].cwe, null);
});

test("a non-JSON reply, a transport failure, and an oversize file all yield no findings", async () => {
  const prose = modelReviewer({ transport: fakeTransport("I could not find any issues.") });
  assert.deepEqual(await prose.review({ relPath: "a.py", content: CONTENT }), []);

  const throwing: Transport = {
    model: "boom",
    async complete() {
      throw new Error("network down");
    },
  };
  assert.deepEqual(await modelReviewer({ transport: throwing }).review({ relPath: "a.py", content: CONTENT }), []);

  const tiny = modelReviewer({ transport: fakeTransport("[]"), maxFileBytes: 4 });
  assert.deepEqual(await tiny.review({ relPath: "big.py", content: CONTENT }), []);
});

test("anthropicTransport shapes the request and reads text blocks back", async () => {
  let captured: { url: string; init: RequestInit } | null = null;
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    captured = { url: String(url), init: init ?? {} };
    return new Response(
      JSON.stringify({ content: [{ type: "text", text: "[]" }], stop_reason: "end_turn" }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;

  const transport = anthropicTransport({ apiKey: "sk-test", model: "claude-opus-5-5", fetchImpl });
  const out = await transport.complete({ system: "sys", user: "usr" });

  assert.equal(out, "[]");
  assert.ok(captured, "fetch was called");
  const { url, init } = captured!;
  assert.match(url, /\/v1\/messages$/);
  assert.equal(init.method, "POST");
  const headers = init.headers as Record<string, string>;
  assert.equal(headers["x-api-key"], "sk-test");
  assert.equal(headers["anthropic-version"], "2023-06-01");
  const body = JSON.parse(init.body as string);
  assert.equal(body.model, "claude-opus-5-5");
  assert.equal(body.messages[0].content, "usr");
  assert.equal(body.system, "sys");
});

test("anthropicTransport maps a refusal to no findings and throws on an API error", async () => {
  const refusing = anthropicTransport({
    apiKey: "sk-test",
    fetchImpl: (async () =>
      new Response(JSON.stringify({ stop_reason: "refusal", content: [] }), { status: 200 })) as typeof fetch,
  });
  assert.equal(await refusing.complete({ system: "s", user: "u" }), "[]");

  const erroring = anthropicTransport({
    apiKey: "sk-test",
    fetchImpl: (async () => new Response("rate limited", { status: 429 })) as typeof fetch,
  });
  await assert.rejects(() => erroring.complete({ system: "s", user: "u" }), /429/);
});

test("anthropicTransport requires a key only when it is actually called", async () => {
  const transport = anthropicTransport({ fetchImpl: (async () => new Response("{}")) as typeof fetch });
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    await assert.rejects(() => transport.complete({ system: "s", user: "u" }), /ANTHROPIC_API_KEY/);
  } finally {
    if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
  }
});

test("compositeReviewer merges reviewers and collapses duplicate findings", async () => {
  // The pattern reviewer flags pickle on line 2; the model flags the same line.
  const model = fakeTransport(
    JSON.stringify([
      { line: 2, cwe: "CWE-502", severity: "high", title: "Unsafe deserialization" },
      { line: 3, cwe: "CWE-200", severity: "low", title: "Information exposure" },
    ]),
  );
  const composite = compositeReviewer([patternReviewer(), modelReviewer({ transport: model })]);
  const found = (await composite.review({ relPath: "ingest.py", content: CONTENT })) as Finding[];

  assert.equal(composite.name, "pattern+model:fake-model");
  // Line 2 is reported once (dedup by line + CWE); line 3 adds the model-only lead.
  const lines = found.map((f) => f.line).sort();
  assert.deepEqual(lines, [2, 3]);
});
