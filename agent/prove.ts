import type { Finding, FindingStatus } from "./findings.ts";

/**
 * The Prove step. A Reviewer opens a lead; a Prover rules on it. Given a finding
 * and the file it came from, a Prover reads the surrounding context and returns
 * a verdict — `verified` when there is corroborating evidence the defect is
 * real, `dismissed` when the match is in a safe or test context, and `open`
 * when it cannot tell and a human should look.
 *
 * This is the seam the roadmap calls "turn a lead into verified/dismissed." The
 * built-in `contextProver` is deterministic, offline and strictly read-only: it
 * reads only the same in-scope file the finding cites and reaches nothing
 * outside the Scope. A model-backed prover — or one that reproduces a finding
 * against the repo's own tests in an isolated worktree — is just another
 * implementation of this interface, and the orchestrator does not care which it
 * is holding. Like the Reviewer, a Prover never claims a finding is exploitable
 * without evidence: when in doubt it leaves the lead `open`.
 */
export interface ProveContext {
  finding: Finding;
  /** Path relative to the scope root (same file the finding cites). */
  relPath: string;
  content: string;
}

export interface Proof {
  status: FindingStatus;
  /** One sentence an operator can read to see why the verdict stands. */
  rationale: string;
}

export interface Prover {
  readonly name: string;
  prove(ctx: ProveContext): Proof | Promise<Proof>;
}

const open = (rationale: string): Proof => ({ status: "open", rationale });
const verified = (rationale: string): Proof => ({ status: "verified", rationale });
const dismissed = (rationale: string): Proof => ({ status: "dismissed", rationale });

/** The rule that raised a finding, recovered from its `${rule}:${file}:${line}` id. */
function ruleOf(finding: Finding): string {
  const suffix = `:${finding.file}:${finding.line}`;
  return finding.id.endsWith(suffix)
    ? finding.id.slice(0, -suffix.length)
    : finding.id.split(":")[0];
}

/** Test, fixture, example and mock paths, where dangerous patterns are usually intentional. */
const TEST_PATH =
  /(^|\/)(tests?|__tests__|specs?|fixtures?|examples?|mocks?|testdata)(\/|$)|[._-](test|spec)\.[a-z]+$|(^|\/)conftest\.py$/i;

/** The lines around the finding, lower-cased, for a keyword scan. */
function contextOf(content: string, line: number, radius = 3): string {
  const lines = content.split("\n");
  const start = Math.max(0, line - 1 - radius);
  const end = Math.min(lines.length, line + radius);
  return lines.slice(start, end).join("\n").toLowerCase();
}

/** The quoted literal a `hardcoded-secret` match captured, if any. */
function quotedValue(evidence: string): string | null {
  const m = /['"]([^'"]{6,})['"]\s*$|['"]([^'"]{6,})['"]/.exec(evidence);
  return m ? (m[1] ?? m[2]) : null;
}

/** Values that read as placeholders, env references or masks, not real secrets. */
function looksPlaceholder(value: string): boolean {
  if (/\$\{|\{\{|<[a-z0-9_]+>|%\(|%s|process\.env|os\.environ|getenv|env\[/i.test(value))
    return true;
  if (/^[*x0._\-\s]+$/i.test(value)) return true; // masked or trivial
  if (
    /^(change[_-]?me|password|passwd|secret|example|test(ing)?|xxx+|your[_-]?|placeholder|redacted|dummy|none|null|todo|fixme|foobar|sample|insert[_-]?|replace[_-]?)/i.test(
      value,
    )
  )
    return true;
  if (new Set(value).size <= 2) return true; // one or two repeated characters
  return false;
}

/** Values that carry a known secret prefix or real-key entropy. */
function looksRealSecret(value: string): boolean {
  if (/^(sk-|rk_|AKIA|ASIA|ghp_|gho_|github_pat_|xox[baprs]-|AIza|-----BEGIN|eyJ[A-Za-z0-9_-]{10,})/.test(value))
    return true;
  const mixed = /[a-z]/.test(value) && /[A-Z0-9]/.test(value);
  return value.length >= 24 && mixed && !/\s/.test(value);
}

/** The argument text of the first `call(` on a line, if it closes on that line. */
function callArg(evidence: string, name: RegExp): string | null {
  const m = new RegExp(name.source + /\s*\(([^)]*)\)/.source, name.flags).exec(evidence);
  return m ? m[1].trim() : null;
}

/** True when an argument is a single string/number literal with no variable or building. */
function isConstantLiteral(arg: string): boolean {
  const s = arg.trim();
  // A lone quoted literal — one that holds no same-quote, so it is not two
  // literals concatenated. `+` inside the quotes is data, not concatenation.
  if (/^'[^']*'$/.test(s) || /^"[^"]*"$/.test(s)) return true;
  if (/^-?\d[\d_.]*$/.test(s)) return true; // a lone number
  return false;
}

/** True when a command/arg is built from a variable, concatenation or interpolation. */
function isDynamic(arg: string): boolean {
  return /`[^`]*\$\{|f["']|\.format\s*\(|%\s|%\(|\+|\$\{|\bformat\b/.test(arg);
}

const SECURITY_CONTEXT =
  /\b(password|passwd|pwd|token|secret|hmac|sign|signature|auth|session|csrf|credential|login|digest)\b/;
const NONSECURITY_CONTEXT =
  /\b(etag|cache|checksum|fingerprint|dedup(e|lication)?|content[_-]?hash|cache[_-]?key|avatar|gravatar|file[_-]?name|shard|bucket)\b/;

type Check = (ctx: {
  evidence: string;
  context: string;
  relPath: string;
  finding: Finding;
}) => Proof;

/**
 * Per-rule verdicts. Each is a conservative heuristic: it only returns a firm
 * `verified`/`dismissed` on a clear signal and otherwise leaves the lead `open`.
 * This keeps the Prove step honest — it narrows the pile a human reviews without
 * ever asserting more certainty than the evidence supports.
 */
const CHECKS: Record<string, Check> = {
  "hardcoded-secret": ({ evidence, relPath }) => {
    if (TEST_PATH.test(relPath))
      return dismissed("Hard-coded value lives in test or fixture code, not a shipped path.");
    const value = quotedValue(evidence);
    if (value && looksPlaceholder(value))
      return dismissed("The literal is a placeholder or environment reference, not a real credential.");
    if (value && looksRealSecret(value))
      return verified("The literal has the length and shape of a real secret committed in source.");
    return open("Could not tell whether this literal is a live credential; inspect the value.");
  },

  "tls-verify-disabled": ({ relPath }) =>
    TEST_PATH.test(relPath)
      ? dismissed("TLS verification is disabled inside test or fixture code.")
      : verified("TLS certificate verification is turned off on a shipped code path."),

  "weak-hash": ({ context, relPath }) => {
    if (TEST_PATH.test(relPath))
      return dismissed("Weak hash is used in test or fixture code.");
    if (NONSECURITY_CONTEXT.test(context))
      return dismissed("Surrounding code uses the hash for a non-security purpose (caching/identity).");
    if (SECURITY_CONTEXT.test(context))
      return verified("The weak hash sits in a security context (password, token or signature).");
    return open("Hash purpose is unclear from context; confirm it is not security-relevant.");
  },

  "py-pickle-loads": ({ evidence, relPath }) => {
    if (TEST_PATH.test(relPath))
      return dismissed("pickle is loaded inside test or fixture code.");
    const arg = callArg(evidence, /\b(?:cPickle|pickle)\.loads?/);
    if (arg !== null && arg.length > 0 && !/^\s*(['"]).*\1\s*$/.test(arg))
      return verified("pickle deserializes a non-literal argument; attacker-controlled bytes reach it.");
    return open("Confirm the pickle input is attacker-influenced before treating it as exploitable.");
  },

  "py-yaml-load": ({ relPath }) =>
    TEST_PATH.test(relPath)
      ? dismissed("yaml.load without a safe loader appears only in test or fixture code.")
      : verified("yaml.load runs without a safe loader on a shipped path, allowing object construction."),

  "py-subprocess-shell": ({ evidence, context, relPath }) => {
    if (TEST_PATH.test(relPath))
      return dismissed("shell=True is used in test or fixture code.");
    if (isDynamic(evidence) || isDynamic(context))
      return verified("The shell command is built from a variable or interpolation; injection is reachable.");
    return open("shell=True with an apparently constant command; confirm no input is interpolated.");
  },

  "py-eval-exec": evalCheck,
  "js-eval": evalCheck,

  "js-child-process-interp": ({ relPath }) =>
    TEST_PATH.test(relPath)
      ? dismissed("The interpolated shell command is in test or fixture code.")
      : verified("A shell command is built from an interpolated string; injection is reachable."),
};

function evalCheck({ evidence, relPath }: {
  evidence: string;
  context: string;
  relPath: string;
  finding: Finding;
}): Proof {
  if (TEST_PATH.test(relPath))
    return dismissed("Dynamic eval/exec appears only in test or fixture code.");
  const arg = callArg(evidence, /\b(?:eval|exec)/);
  if (arg !== null && isConstantLiteral(arg))
    return dismissed("The eval/exec argument is a constant literal; no untrusted input reaches it.");
  if (arg !== null && arg.length > 0 && isDynamic(arg))
    return verified("eval/exec runs a dynamically built string; untrusted input can reach the interpreter.");
  return open("Could not tell whether the eval/exec argument is attacker-influenced; verify by hand.");
}

/**
 * The built-in, offline prover. Rules on each finding from the file it cites and
 * nothing else. When no check knows the rule, the lead stays `open` — Prove only
 * ever removes uncertainty it can justify.
 */
export function contextProver(): Prover {
  return {
    name: "context",
    prove({ finding, relPath, content }: ProveContext): Proof {
      const check = CHECKS[ruleOf(finding)];
      if (!check)
        return open("No automated check for this finding class; verify by hand.");
      return check({
        evidence: finding.evidence,
        context: contextOf(content, finding.line),
        relPath,
        finding,
      });
    },
  };
}
