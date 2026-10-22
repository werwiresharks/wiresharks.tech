import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { globToRegExp, resolveScope } from "./scope.ts";

test("globToRegExp anchors and handles *, ** and ?", () => {
  assert.equal(globToRegExp("*.py").test("a.py"), true);
  assert.equal(globToRegExp("*.py").test("src/a.py"), false, "* does not cross /");
  assert.equal(globToRegExp("**/*.py").test("src/deep/a.py"), true);
  assert.equal(globToRegExp("**/*.py").test("a.py"), true, "**/ matches zero segments");
  assert.equal(globToRegExp("a?.py").test("ab.py"), true);
  assert.equal(globToRegExp("a?.py").test("a/.py"), false);
  assert.equal(globToRegExp("**/node_modules/**").test("x/node_modules/y.js"), true);
});

test("resolveScope rejects a non-directory root", async () => {
  const dir = await mkdtemp(join(tmpdir(), "scope-"));
  try {
    const file = join(dir, "f.txt");
    await writeFile(file, "x");
    assert.throws(() => resolveScope({ root: file }));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a path outside the root is never in scope, even via ..", async () => {
  const dir = await mkdtemp(join(tmpdir(), "scope-"));
  try {
    await mkdir(join(dir, "repo"));
    await writeFile(join(dir, "repo", "in.py"), "x");
    await writeFile(join(dir, "out.py"), "x");
    const scope = resolveScope({ root: join(dir, "repo") });
    assert.equal(scope.inScope(join(dir, "repo", "in.py")), true);
    assert.equal(scope.inScope(join(dir, "out.py")), false);
    assert.equal(scope.inScope(join(dir, "repo", "..", "out.py")), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a symlink pointing outside the root is not in scope", async () => {
  const dir = await mkdtemp(join(tmpdir(), "scope-"));
  try {
    await mkdir(join(dir, "repo"));
    await writeFile(join(dir, "secret.env"), "TOKEN=1");
    await symlink(join(dir, "secret.env"), join(dir, "repo", "link.env"));
    const scope = resolveScope({ root: join(dir, "repo") });
    assert.equal(scope.inScope(join(dir, "repo", "link.env")), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("include and exclude globs gate files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "scope-"));
  try {
    await mkdir(join(dir, "repo"));
    await writeFile(join(dir, "repo", "a.py"), "x");
    await writeFile(join(dir, "repo", "a.md"), "x");
    const scope = resolveScope({
      root: join(dir, "repo"),
      include: ["**/*.py"],
      exclude: ["**/skip.py"],
    });
    assert.equal(scope.inScope(join(dir, "repo", "a.py")), true);
    assert.equal(scope.inScope(join(dir, "repo", "a.md")), false, "include miss");
    await writeFile(join(dir, "repo", "skip.py"), "x");
    assert.equal(scope.inScope(join(dir, "repo", "skip.py")), false, "excluded");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
