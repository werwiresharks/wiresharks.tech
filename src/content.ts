/** Product facts shared across pages. Each line matches what ships; see the merged raptor pull requests. */

/** The authorized repository security review, as `agent/` runs it today: read-only, four steps. */
export const REVIEW_STEPS: [string, string][] = [
  ["Scope", "You name a repository and the paths the review may read."],
  ["Map", "The review lists the files in scope. It never reads outside them."],
  ["Find", "Workers read each file and flag known defect patterns, each with its CWE."],
  ["Report", "The review writes an evidence report. A high or critical finding fails the run, so the review can gate CI."],
];

