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
 * use. Operations in one process are serialized so a duplicate is never
 * appended twice and the index only includes successful writes.
 */
export function createFileWaitlist(path: string): WaitlistStore {
  const seen = new Set<string>();
  let loaded: Promise<void> | null = null;
  let pending = Promise.resolve();

  const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = pending.then(operation);
    // A failed operation must not block later requests from retrying.
    pending = result.then(() => {}, () => {});
    return result;
  };

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
        .catch((error: NodeJS.ErrnoException) => {
          // Only a missing file means an empty index. Retry other read failures
          // next time instead of accepting entries against an incomplete index.
          if (error.code === "ENOENT") return;
          loaded = null;
          throw error;
        });
    }
    return loaded;
  };

  return {
    add(email, source) {
      return serialize(async () => {
        await load();
        const key = normalizeEmail(email);
        if (seen.has(key)) return "duplicate";
        const entry: WaitlistEntry = { email: key, at: new Date().toISOString() };
        if (source) entry.source = source;
        await mkdir(dirname(path), { recursive: true });
        await appendFile(path, JSON.stringify(entry) + "\n", "utf8");
        seen.add(key);
        return "added";
      });
    },
    count() {
      return serialize(async () => {
        await load();
        return seen.size;
      });
    },
  };
}
