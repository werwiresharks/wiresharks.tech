/** Product facts shared across pages. Each line matches what ships; see the merged raptor pull requests. */

/** The authorized repository security review, as `agent/` runs it today: read-only, four steps. */
export const REVIEW_STEPS: [string, string][] = [
  ["Scope", "You name a repository and the paths the review may read."],
  ["Map", "The review lists the files in scope. It never reads outside them."],
  ["Find", "Workers read each file and flag known defect patterns, each with its CWE."],
  ["Report", "The review writes an evidence report. A high or critical finding fails the run, so the review can gate CI."],
];

/** What ships on release day. Nothing here is published before then. */
export const RELEASE_ARTIFACTS: [string, string][] = [
  ["Weights", "talon-1, quantized for llama.cpp, vLLM and Apple Silicon."],
  ["Evaluations", "talon-1 compared with its base model, the base with refusals removed, and leading open-weight and frontier models."],
  ["Benchmark suite", "Public and reproducible. Anyone can run it and check the results."],
  ["raptor", "The autonomous agent, running on Harness. It uses talon-1 by default."],
  ["Harness", "The infrastructure that runs and coordinates raptor's work."],
];

