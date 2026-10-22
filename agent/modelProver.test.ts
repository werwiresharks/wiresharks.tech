import { test } from "node:test";
import assert from "node:assert/strict";
import { modelProver, firstDecisiveProver } from "./modelProver.ts";
import { contextProver } from "./prove.ts";
import type { Transport } from "./modelReviewer.ts";
import type { Finding } from "./findings.ts";

function fakeTransport(reply: string): Transport & { seen: { system: string; user: string }[] } {
  const seen: { system: string; user: string }[] = [];
  return {
    model: "fake",
    seen,
    async complete(input) {
      seen.push(input);
      return reply;
    },
  };
}

const finding: Finding = {
  id: "py-pickle-loads:ingest.py:2",
  file: "ingest.py",
  line: 2,
  cwe: "CWE-502",
  severity: "high",
  title: "Unsafe deserialization",
  evidence: "obj = pickle.loads(body)",
  status: "open",
};
const content = "import pickle\nobj = pickle.loads(body)\n";

test("modelProver parses a verdict and passes the finding in its prompt", async () => {
  const transport = fakeTransport('{"status":"verified","rationale":"Untrusted bytes reach pickle.loads."}');
  const proof = await modelProver({ transport }).prove({ finding, relPath: "ingest.py", content });
  assert.equal(proof.status, "verified");
  assert.match(proof.rationale, /pickle/);
  assert.match(transport.seen[0].user, /CWE-502/);
  assert.match(transport.seen[0].user, /2: obj = pickle\.loads\(body\)/);
});

test("an unknown status, a non-JSON reply, and a failure all fall back to open", async () => {
  const bogus = await modelProver({ transport: fakeTransport('{"status":"maybe","rationale":"unsure"}') })
    .prove({ finding, relPath: "ingest.py", content });
  assert.equal(bogus.status, "open");

  const prose = await modelProver({ transport: fakeTransport("I think it is fine.") })
    .prove({ finding, relPath: "ingest.py", content });
  assert.equal(prose.status, "open");

  const throwing: Transport = {
    model: "boom",
    async complete() {
      throw new Error("down");
    },
  };
  const failed = await modelProver({ transport: throwing }).prove({ finding, relPath: "ingest.py", content });
  assert.equal(failed.status, "open");
  assert.match(failed.rationale, /unavailable/i);
});

test("firstDecisiveProver takes a deterministic verdict before consulting the model", async () => {
  let modelCalls = 0;
  const countingModel: Transport = {
    model: "fake",
    async complete() {
      modelCalls += 1;
      return '{"status":"verified","rationale":"model ran"}';
    },
  };
  const layered = firstDecisiveProver([contextProver(), modelProver({ transport: countingModel })]);

  // contextProver verifies a pickle lead on a shipped path, so the model is never called.
  const decided = await layered.prove({ finding, relPath: "ingest.py", content });
  assert.equal(decided.status, "verified");
  assert.match(decided.rationale, /pickle/);
  assert.equal(modelCalls, 0, "the model is skipped when a deterministic verdict exists");
});

test("firstDecisiveProver falls through to the model for an open lead", async () => {
  // A model-found finding has no deterministic rule, so contextProver returns open.
  const modelFinding: Finding = { ...finding, id: "model-0:util.py:1", file: "util.py", line: 1, cwe: "CWE-1004" };
  const layered = firstDecisiveProver([
    contextProver(),
    modelProver({ transport: fakeTransport('{"status":"dismissed","rationale":"Not reachable."}') }),
  ]);
  const proof = await layered.prove({ finding: modelFinding, relPath: "util.py", content: "x = 1\n" });
  assert.equal(proof.status, "dismissed");
  assert.match(proof.rationale, /reachable/i);
});
