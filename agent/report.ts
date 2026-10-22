import { countBySeverity, countByStatus } from "./findings.ts";
import type { ReviewResult } from "./review.ts";

/**
 * Render a review result as Markdown: evidence an operator can act on, not a
 * verdict pulled from thin air. Every finding cites a file, a line and the
 * triggering text, so each one can be checked by hand. When the Prove step has
 * run, each finding also carries a status — verified, dismissed or still open —
 * and the reasoning behind it, so the report separates what was corroborated
 * from what is only a lead.
 */
export function renderReport(result: ReviewResult): string {
  const { findings } = result;
  const counts = countBySeverity(findings);
  const order = ["critical", "high", "medium", "low", "info"] as const;
  const summary = order
    .filter((s) => counts[s] > 0)
    .map((s) => `${counts[s]} ${s}`)
    .join(", ");

  const lines: string[] = [];
  lines.push("# Raptor review");
  lines.push("");
  lines.push(`- Root: \`${result.root}\``);
  lines.push(`- Reviewer: ${result.reviewer}`);
  if (result.prover) lines.push(`- Prover: ${result.prover}`);
  lines.push(`- Files reviewed: ${result.fileCount}`);
  lines.push(`- Findings: ${findings.length}${summary ? ` (${summary})` : ""}`);
  if (result.prover) {
    const status = countByStatus(findings);
    lines.push(
      `- Verification: ${status.verified} verified, ${status.dismissed} dismissed, ${status.open} open`,
    );
  }
  lines.push("");

  if (findings.length === 0) {
    lines.push("No findings. This is not a guarantee; it is the limit of this pass.");
    lines.push("");
    return lines.join("\n");
  }

  lines.push("| Severity | Status | CWE | Location | Finding | Evidence |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const f of findings) {
    const loc = `${f.file}:${f.line}`;
    const evidence = "`" + f.evidence.replace(/\|/g, "\\|") + "`";
    lines.push(
      `| ${f.severity} | ${f.status} | ${f.cwe ?? "—"} | ${loc} | ${f.title} | ${evidence} |`,
    );
  }
  lines.push("");

  // Where the Prove step ruled, show why — verified first, then dismissed, so a
  // reader can see what was corroborated and what was ruled out, each with its
  // reason. Open leads carry no note; they are the table rows still to check.
  const ruled = findings.filter((f) => f.rationale && f.status !== "open");
  if (ruled.length > 0) {
    lines.push("## Verification");
    lines.push("");
    const byStatus = (s: "verified" | "dismissed") =>
      ruled.filter((f) => f.status === s);
    for (const f of [...byStatus("verified"), ...byStatus("dismissed")]) {
      lines.push(`- **${f.status}** \`${f.file}:${f.line}\` — ${f.rationale}`);
    }
    lines.push("");
  }

  lines.push(
    result.prover
      ? "Verified findings have corroborating evidence; open findings are leads to check. Nothing here authorizes action — read the cited line first."
      : "Each finding is a lead to verify, not a confirmed vulnerability. Check the cited line before acting.",
  );
  lines.push("");
  return lines.join("\n");
}
