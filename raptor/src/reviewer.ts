import type { Finding, Severity } from "./findings.ts";

/**
 * A Reviewer reads one file and reports what it finds. This is the seam the
 * marketing page means by "works with any model": the built-in reviewer below
 * is a deterministic pattern pass that needs no network and no credentials, and
 * a model-backed reviewer is just another implementation of this interface that
 * an operator wires in with their own aligned model. The orchestrator does not
 * care which it is holding.
 */
export interface ReviewContext {
  /** Path relative to the scope root. */
  relPath: string;
  content: string;
}

export interface Reviewer {
  readonly name: string;
  review(ctx: ReviewContext): Finding[] | Promise<Finding[]>;
}

interface Rule {
  id: string;
  cwe: string | null;
  severity: Severity;
  title: string;
  /** File extensions the rule applies to; empty means every file. */
  exts: readonly string[];
  /** Matched per line; the whole match is not used, only that it matched. */
  pattern: RegExp;
}

/**
 * Deterministic detections for well-known dangerous patterns. Each is a defect
 * class with a CWE an operator can look up; none of them exploit anything, they
 * point at code to read. Kept small and precise on purpose — a reviewer that
 * cries wolf teaches people to ignore it.
 */
const RULES: readonly Rule[] = [
  {
    id: "py-pickle-loads",
    cwe: "CWE-502",
    severity: "high",
    title: "Deserializing untrusted data with pickle",
    exts: [".py"],
    pattern: /\b(?:cPickle|pickle)\.loads?\s*\(/,
  },
  {
    id: "py-yaml-load",
    cwe: "CWE-502",
    severity: "medium",
    title: "yaml.load without a safe loader",
    exts: [".py"],
    pattern: /\byaml\.load\s*\((?![^)]*Safe)/,
  },
  {
    id: "py-subprocess-shell",
    cwe: "CWE-78",
    severity: "high",
    title: "subprocess call with shell=True",
    exts: [".py"],
    pattern: /shell\s*=\s*True/,
  },
  {
    id: "py-eval-exec",
    cwe: "CWE-95",
    severity: "high",
    title: "Dynamic eval/exec of a string",
    exts: [".py"],
    pattern: /\b(?:eval|exec)\s*\(/,
  },
  {
    id: "js-child-process-interp",
    cwe: "CWE-78",
    severity: "high",
    title: "Shell command built from an interpolated string",
    exts: [".js", ".ts", ".mjs", ".cjs", ".jsx", ".tsx"],
    pattern: /\bexec(?:Sync)?\s*\(\s*`[^`]*\$\{/,
  },
  {
    id: "js-eval",
    cwe: "CWE-95",
    severity: "high",
    title: "Dynamic eval of a string",
    exts: [".js", ".ts", ".mjs", ".cjs", ".jsx", ".tsx"],
    pattern: /(?<![.\w])eval\s*\(/,
  },
  {
    id: "tls-verify-disabled",
    cwe: "CWE-295",
    severity: "medium",
    title: "TLS certificate verification disabled",
    exts: [],
    pattern: /verify\s*=\s*False|rejectUnauthorized\s*:\s*false/,
  },
  {
    id: "weak-hash",
    cwe: "CWE-327",
    severity: "low",
    title: "Weak hash function for a security purpose",
    exts: [],
    pattern: /\b(?:md5|sha1)\s*\(/i,
  },
  {
    id: "hardcoded-secret",
    cwe: "CWE-798",
    severity: "medium",
    title: "Possible hard-coded credential",
    exts: [],
    pattern:
      /\b(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"]{6,}['"]/i,
  },
];

const extOf = (relPath: string): string => {
  const dot = relPath.lastIndexOf(".");
  return dot === -1 ? "" : relPath.slice(dot).toLowerCase();
};

/** True once a line is a comment-only line in the common languages. */
const isComment = (line: string): boolean => /^\s*(#|\/\/|\*)/.test(line);

/**
 * The built-in, offline reviewer. Scans each line against the rule set and
 * emits a finding per hit, with the triggering line as evidence.
 */
export function patternReviewer(): Reviewer {
  return {
    name: "pattern",
    review({ relPath, content }: ReviewContext): Finding[] {
      const ext = extOf(relPath);
      const lines = content.split("\n");
      const findings: Finding[] = [];
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (isComment(line)) continue;
        for (const rule of RULES) {
          if (rule.exts.length > 0 && !rule.exts.includes(ext)) continue;
          if (!rule.pattern.test(line)) continue;
          findings.push({
            id: `${rule.id}:${relPath}:${i + 1}`,
            file: relPath,
            line: i + 1,
            cwe: rule.cwe,
            severity: rule.severity,
            title: rule.title,
            evidence: line.trim().slice(0, 200),
            status: "open",
          });
        }
      }
      return findings;
    },
  };
}
