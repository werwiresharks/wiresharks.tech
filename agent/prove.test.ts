import { test } from "node:test";
import assert from "node:assert/strict";
import { patternReviewer } from "./reviewer.ts";
import { contextProver } from "./prove.ts";
import type { Finding, FindingStatus } from "./findings.ts";

/** Review one file, then prove every lead it raised, as the orchestrator does. */
function proven(relPath: string, content: string): Finding[] {
  const reviewer = patternReviewer();
  const prover = contextProver();
  const leads = reviewer.review({ relPath, content }) as Finding[];
  return leads.map((finding) => {
    const proof = prover.prove({ finding, relPath, content }) as {
      status: FindingStatus;
      rationale: string;
    };
    return { ...finding, status: proof.status, rationale: proof.rationale };
  });
}

/** The single lead a one-rule fixture raises, asserted to exist first. */
function only(relPath: string, content: string): Finding {
  const found = proven(relPath, content);
  assert.equal(found.length, 1, `expected one finding in ${relPath}`);
  return found[0];
}

test("dismisses a placeholder credential, verifies a real one", () => {
  assert.equal(only("config.py", 'password = "changeme123"').status, "dismissed");
  assert.equal(only("config.py", 'password = "${DB_PASSWORD}"').status, "dismissed");
  const real = only("config.py", 'api_key = "sk-abcdefghijklmnopqrstuvwx"');
  assert.equal(real.status, "verified");
  assert.match(real.rationale ?? "", /secret/i);
});

test("a hard-coded value in test code is dismissed", () => {
  assert.equal(only("tests/test_config.py", 'password = "sk-abcdefghijklmnopqrstuvwx"').status, "dismissed");
});

test("disabled TLS verification: verified in app code, dismissed in tests", () => {
  assert.equal(only("client.py", "ctx = requests.get(url, verify=False)").status, "verified");
  assert.equal(only("tests/test_client.py", "requests.get(url, verify=False)").status, "dismissed");
});

test("weak hash verdict follows its context", () => {
  assert.equal(only("auth.py", "signature = md5(secret_key)").status, "verified");
  assert.equal(only("cache.py", "etag = md5(body)").status, "dismissed");
  assert.equal(only("util.py", "h = md5(data)").status, "open");
});

test("pickle.loads: verified on a variable, open on a bare literal", () => {
  assert.equal(only("ingest.py", "obj = pickle.loads(body)").status, "verified");
  assert.equal(only("ingest.py", 'obj = pickle.loads("")').status, "open");
  assert.equal(only("tests/test_ingest.py", "obj = pickle.loads(body)").status, "dismissed");
});

test("eval: dismissed on a constant literal, verified on a built string", () => {
  assert.equal(only("calc.py", 'x = eval("1 + 1")').status, "dismissed");
  assert.equal(only("calc.py", 'x = eval("do_" + name)').status, "verified");
});

test("interpolated shell command is verified outside tests", () => {
  assert.equal(only("run.js", "execSync(`ls ${dir}`)").status, "verified");
  assert.equal(only("tests/run.test.js", "execSync(`ls ${dir}`)").status, "dismissed");
});

test("an unknown finding class stays open", () => {
  const finding: Finding = {
    id: "made-up-rule:x.py:1",
    file: "x.py",
    line: 1,
    cwe: null,
    severity: "low",
    title: "Synthetic",
    evidence: "whatever",
    status: "open",
  };
  const proof = contextProver().prove({ finding, relPath: "x.py", content: "whatever\n" });
  assert.equal(proof.status, "open");
  assert.match(proof.rationale, /no automated check/i);
});
