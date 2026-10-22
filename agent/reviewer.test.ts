import { test } from "node:test";
import assert from "node:assert/strict";
import { patternReviewer } from "./reviewer.ts";
import type { Finding } from "./findings.ts";

const review = (relPath: string, content: string): Finding[] =>
  patternReviewer().review({ relPath, content }) as Finding[];

test("flags pickle.loads in Python with CWE-502", () => {
  const found = review("upload.py", "import pickle\ndata = pickle.loads(body)\n");
  assert.equal(found.length, 1);
  assert.equal(found[0].cwe, "CWE-502");
  assert.equal(found[0].line, 2);
  assert.equal(found[0].severity, "high");
});

test("flags subprocess shell=True and eval", () => {
  const found = review("run.py", "subprocess.run(cmd, shell=True)\nx = eval(expr)\n");
  const cwes = found.map((f) => f.cwe).sort();
  assert.deepEqual(cwes, ["CWE-78", "CWE-95"]);
});

test("rules are language-scoped: shell=True only matters in .py", () => {
  const found = review("notes.md", "shell=True is a Python footgun\n");
  assert.equal(found.length, 0);
});

test("comment-only lines are ignored", () => {
  const found = review("x.py", "# pickle.loads(body) is dangerous\n");
  assert.equal(found.length, 0);
});

test("flags disabled TLS verification in any language", () => {
  const found = review("client.ts", "const agent = new https.Agent({ rejectUnauthorized: false });\n");
  assert.equal(found.length, 1);
  assert.equal(found[0].cwe, "CWE-295");
});

test("finding ids are stable and locate the hit", () => {
  const found = review("a.py", "\npickle.loads(x)\n");
  assert.equal(found[0].id, "py-pickle-loads:a.py:2");
});
