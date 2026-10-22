import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Waitlist storage for the site gateway. The HTTP layer validates input at the
 * boundary; a store only persists and deduplicates normalized entries. Two
 * implementations: an in-memory one for tests, and an append-only JSONL file
 * that survives restarts without a database.
 */
export type WaitlistEntry = { email: string; at: string; source?: string };

export type AddResult = "added" | "duplicate";

export interface WaitlistStore {
  add(email: string, source?: string): Promise<AddResult>;
  count(): Promise<number>;
}

/** Lowercase and trim; the single normalization dedup relies on. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** A deliberately conservative check: one @, a dot in the domain, no spaces. */
export function isValidEmail(email: string): boolean {
  if (email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createMemoryWaitlist(): WaitlistStore {
  const seen = new Set<string>();
  return {
    async add(email, _source) {
      const key = normalizeEmail(email);
      if (seen.has(key)) return "duplicate";
      seen.add(key);
      return "added";
    },
    async count() {
      return seen.size;
    },
  };
}

/**
 * Append-only JSONL store with an in-memory dedup index loaded once on first
 * use. Concurrent adds of the same email in one process are serialized through
 * the index, so a duplicate is never appended twice.
 */
export function createFileWaitlist(path: string): WaitlistStore {
  const seen = new Set<string>();
  let loaded: Promise<void> | null = null;

  const load = () => {
    if (!loaded) {
      loaded = readFile(path, "utf8")
        .then((text) => {
          for (const line of text.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const entry = JSON.parse(trimmed) as WaitlistEntry;
              if (entry.email) seen.add(normalizeEmail(entry.email));
            } catch {
              // Skip a corrupt line rather than failing the whole store.
            }
          }
        })
        .catch(() => {
          // No file yet: an empty index is correct.
        });
    }
    return loaded;
  };

  return {
    async add(email, source) {
      await load();
      const key = normalizeEmail(email);
      if (seen.has(key)) return "duplicate";
      seen.add(key);
      const entry: WaitlistEntry = { email: key, at: new Date().toISOString() };
      if (source) entry.source = source;
      await mkdir(dirname(path), { recursive: true });
      await appendFile(path, JSON.stringify(entry) + "\n", "utf8");
      return "added";
    },
    async count() {
      await load();
      return seen.size;
    },
  };
}
