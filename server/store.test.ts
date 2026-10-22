import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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
