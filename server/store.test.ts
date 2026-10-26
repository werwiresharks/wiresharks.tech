import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createFileWaitlist,
  createMemoryWaitlist,
  isValidEmail,
  normalizeEmail,
} from "./store.ts";

test("isValidEmail accepts plausible addresses and rejects the rest", () => {
  for (const ok of ["a@b.co", "sid.gunti+raptor@wiresharks.tech"]) {
    assert.equal(isValidEmail(ok), true, ok);
  }
  for (const bad of ["", "nope", "a@b", "a @b.co", "a@b .co", "x".repeat(260) + "@b.co"]) {
    assert.equal(isValidEmail(bad), false, bad);
  }
});

test("normalizeEmail lowercases and trims so dedup is case-insensitive", () => {
  assert.equal(normalizeEmail("  SID@Wiresharks.TECH "), "sid@wiresharks.tech");
});

test("the memory store deduplicates by normalized email", async () => {
  const store = createMemoryWaitlist();
  assert.equal(await store.add("A@B.co"), "added");
  assert.equal(await store.add("a@b.co"), "duplicate");
  assert.equal(await store.count(), 1);
});

test("the file store persists entries and dedups across reloads", async () => {
  const dir = await mkdtemp(join(tmpdir(), "waitlist-"));
  const path = join(dir, "nested", "waitlist.jsonl");
  try {
    const first = createFileWaitlist(path);
    assert.equal(await first.add("a@b.co", "home"), "added");
    assert.equal(await first.add("a@b.co"), "duplicate");
    assert.equal(await first.add("c@d.co"), "added");

    const text = await readFile(path, "utf8");
    const lines = text.trim().split("\n");
    assert.equal(lines.length, 2, "duplicates are never appended");
    assert.equal(JSON.parse(lines[0]).email, "a@b.co");
    assert.equal(JSON.parse(lines[0]).source, "home");

    // A new store instance loads the existing file and still dedups.
    const reloaded = createFileWaitlist(path);
    assert.equal(await reloaded.count(), 2);
    assert.equal(await reloaded.add("a@b.co"), "duplicate");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("failed writes do not count or deduplicate an entry, and a retry persists it", async () => {
  const dir = await mkdtemp(join(tmpdir(), "waitlist-"));
  const path = join(dir, "waitlist.jsonl");
  try {
    const store = createFileWaitlist(path);
    assert.equal(await store.count(), 0);
    // A directory where the file should be makes append fail on every platform.
    await mkdir(path);
    const attempts = await Promise.allSettled([
      store.add("A@B.co"),
      store.add("a@b.co"),
    ]);
    assert.ok(attempts.every((attempt) => attempt.status === "rejected"));
    assert.equal(await store.count(), 0, "only persisted entries count");

    await rm(path, { recursive: true });
    assert.equal(await store.add("a@b.co"), "added");
    assert.equal(await store.count(), 1);
    assert.equal(await createFileWaitlist(path).count(), 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a failed index load is reported and can be retried after recovery", async () => {
  const dir = await mkdtemp(join(tmpdir(), "waitlist-"));
  const path = join(dir, "waitlist.jsonl");
  try {
    await mkdir(path);
    const store = createFileWaitlist(path);
    await assert.rejects(store.count());
    await assert.rejects(store.add("a@b.co"));

    await rm(path, { recursive: true });
    await writeFile(path, JSON.stringify({ email: "A@B.co", at: "2026-10-26" }) + "\n");
    assert.equal(await store.count(), 1);
    assert.equal(await store.add("a@b.co"), "duplicate");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("concurrent normalized duplicates are appended once, alongside distinct entries", async () => {
  const dir = await mkdtemp(join(tmpdir(), "waitlist-"));
  const path = join(dir, "waitlist.jsonl");
  try {
    const store = createFileWaitlist(path);
    const results = await Promise.all([
      ...Array.from({ length: 12 }, (_, index) => store.add(index % 2 ? "A@B.co" : " a@b.co ")),
      store.add("c@d.co"),
      store.add("e@f.co"),
    ]);
    assert.equal(results.filter((result) => result === "added").length, 3);
    assert.equal(results.filter((result) => result === "duplicate").length, 11);
    assert.equal(await store.count(), 3);
    const emails = (await readFile(path, "utf8")).trim().split("\n")
      .map((line) => JSON.parse(line).email).sort();
    assert.deepEqual(emails, ["a@b.co", "c@d.co", "e@f.co"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
