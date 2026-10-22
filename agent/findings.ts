/**
 * The product of a review: typed findings. A finding is evidence, not a verdict
 * — it cites a file, a line and the text that triggered it, so an operator can
 * check it. Raptor never claims a finding is exploitable without proof; the
 * `status` field records how far verification got.
 */
export type Severity = "info" | "low" | "medium" | "high" | "critical";

export type FindingStatus = "open" | "verified" | "dismissed";

export interface Finding {
  /** Stable identity: `${ruleId}:${file}:${line}`. */
  id: string;
  /** Path relative to the scope root. */
  file: string;
  line: number;
  cwe: string | null;
  severity: Severity;
  title: string;
  /** The source line that triggered the finding, trimmed. */
  evidence: string;
  status: FindingStatus;
  /**
   * Why the status is what it is, set by the Prove step. Absent on a raw lead
   * the reviewer has only `open`ed; present once a prover has ruled on it.
   */
  rationale?: string;
}

const RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

/** Most severe first, then by file and line, for stable report ordering. */
export function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) =>
      RANK[a.severity] - RANK[b.severity] ||
      a.file.localeCompare(b.file) ||
      a.line - b.line,
  );
}

/** Count findings by severity, for a report summary line. */
export function countBySeverity(
  findings: readonly Finding[],
): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const f of findings) counts[f.severity] += 1;
  return counts;
}

/** Count findings by verification status, for the Prove-step summary. */
export function countByStatus(
  findings: readonly Finding[],
): Record<FindingStatus, number> {
  const counts: Record<FindingStatus, number> = {
    open: 0,
    verified: 0,
    dismissed: 0,
  };
  for (const f of findings) counts[f.status] += 1;
  return counts;
}
