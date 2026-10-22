import { countBySeverity } from "./findings.ts";
import type { ReviewResult } from "./review.ts";

/**
 * Render a review result as Markdown: evidence an operator can act on, not a
 * verdict. Every finding cites a file, a line and the triggering text, so each
 * one can be checked by hand. Nothing here is a claim that a finding is
 * exploitable — only that it is worth a look.
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
  lines.push(`- Files reviewed: ${result.fileCount}`);
  lines.push(`- Findings: ${findings.length}${summary ? ` (${summary})` : ""}`);
  lines.push("");

  if (findings.length === 0) {
    lines.push("No findings. This is not a guarantee; it is the limit of this pass.");
    lines.push("");
    return lines.join("\n");
  }

  lines.push("| Severity | CWE | Location | Finding | Evidence |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const f of findings) {
    const loc = `${f.file}:${f.line}`;
    const evidence = "`" + f.evidence.replace(/\|/g, "\\|") + "`";
    lines.push(
      `| ${f.severity} | ${f.cwe ?? "—"} | ${loc} | ${f.title} | ${evidence} |`,
    );
  }
  lines.push("");
  lines.push(
    "Each finding is a lead to verify, not a confirmed vulnerability. Check the cited line before acting.",
  );
  lines.push("");
  return lines.join("\n");
}
