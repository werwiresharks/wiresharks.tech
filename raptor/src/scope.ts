import { realpathSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

/**
 * The authorization boundary for a Raptor review.
 *
 * Raptor is only ever pointed at a repository an operator has explicitly
 * authorized. A Scope resolves that authorization once, up front, and every
 * later step asks it whether a path is in bounds. Nothing in the review reads a
 * file the Scope has not cleared, and the Scope never clears a path outside the
 * authorized root — not through `..`, not through an absolute path, not through
 * a symlink that points back out. This is the single place that decision lives.
 */
export interface Scope {
  /** The authorized root, resolved to an absolute, symlink-free path. */
  readonly root: string;
  /** Glob patterns a path must match (relative to root); empty means all. */
  readonly include: readonly string[];
  /** Glob patterns that exclude a path even when it is included. */
  readonly exclude: readonly string[];
  /** True when `absPath` is inside the root and passes the include/exclude. */
  inScope(absPath: string): boolean;
}

export interface ScopeRequest {
  root: string;
  include?: readonly string[];
  exclude?: readonly string[];
}

/** Directories never worth reviewing; always excluded unless overridden. */
export const DEFAULT_EXCLUDE: readonly string[] = [
  "**/.git/**",
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.data/**",
];

/** Translate a restricted glob (`*`, `**`, `?`) into an anchored RegExp. */
export function globToRegExp(glob: string): RegExp {
  let out = "";
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        // `**/` matches any number of path segments, including none.
        if (glob[i + 2] === "/") {
          out += "(?:.*/)?";
          i += 2;
        } else {
          out += ".*";
          i += 1;
        }
      } else {
        out += "[^/]*";
      }
    } else if (c === "?") {
      out += "[^/]";
    } else if ("\\^$.|+()[]{}".includes(c)) {
      out += "\\" + c;
    } else {
      out += c;
    }
  }
  return new RegExp("^" + out + "$");
}

/** A path is in scope when it is under root and passes include then exclude. */
function matches(relPath: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((re) => re.test(relPath));
}

/**
 * Resolve an authorization request into a Scope. Throws if the root does not
 * exist or is not a directory, so a review can never start against a path the
 * operator cannot have meant.
 */
export function resolveScope(request: ScopeRequest): Scope {
  const root = realpathSync(resolve(request.root));
  if (!statSync(root).isDirectory()) {
    throw new Error(`Scope root is not a directory: ${root}`);
  }

  const include = request.include ?? [];
  const exclude = request.exclude ?? DEFAULT_EXCLUDE;
  const includeRe = include.map(globToRegExp);
  const excludeRe = exclude.map(globToRegExp);

  return {
    root,
    include,
    exclude,
    inScope(absPath: string): boolean {
      // Resolve symlinks where we can, so a link cannot smuggle a path out.
      let real: string;
      try {
        real = realpathSync(absPath);
      } catch {
        real = resolve(absPath);
      }
      if (real !== root && !real.startsWith(root + sep)) return false;

      const rel = relative(root, real);
      if (rel === "") return false; // the root directory itself is not a file
      const posixRel = rel.split(sep).join("/");

      if (includeRe.length > 0 && !matches(posixRel, includeRe)) return false;
      if (matches(posixRel, excludeRe)) return false;
      return true;
    },
  };
}
