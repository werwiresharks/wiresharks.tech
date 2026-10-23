import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { globToRegExp } from "./scope.ts";
import type { Scope } from "./scope.ts";

/**
 * Map the authorized repository: walk it once and return the files the Scope
 * clears. The walk never follows a directory symlink (a link could point out of
 * scope) and skips files too large to be source, so the review has a bounded,
 * in-scope file set to work from.
 */
export interface RepoMap {
  root: string;
  files: string[];
}

/** Files past this size are treated as assets, not source, and skipped. */
const MAX_FILE_BYTES = 512 * 1024;

export async function mapRepo(scope: Scope): Promise<RepoMap> {
  const files: string[] = [];
  const excludeRe = scope.exclude.map(globToRegExp);

  // A directory is pruned when an exclude pattern matches it directly, so we
  // never descend node_modules or .git. Include patterns are left to the
  // per-file check: a directory can hold matching files even if its own name
  // does not match the include glob.
  const pruned = (rel: string): boolean =>
    excludeRe.some((re) => re.test(rel) || re.test(rel + "/x"));

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // unreadable directory: skip rather than fail the whole map
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isSymbolicLink()) continue; // never follow links out of scope
      if (entry.isDirectory()) {
        const rel = relative(scope.root, full).split(sep).join("/");
        if (pruned(rel)) continue;
        await walk(full);
      } else if (entry.isFile() && scope.inScope(full)) {
        try {
          if ((await stat(full)).size <= MAX_FILE_BYTES) {
            files.push(relative(scope.root, full).split(sep).join("/"));
          }
        } catch {
          // Vanished between readdir and stat: skip.
        }
      }
    }
  }

  await walk(scope.root);
  files.sort();
  return { root: scope.root, files };
}

/** Read a mapped file's text, relative to the map root. */
export function readMapped(map: RepoMap, relPath: string): Promise<string> {
  return readFile(join(map.root, relPath), "utf8");
}
