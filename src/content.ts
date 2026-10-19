/** Product facts shared across pages. Copy here is drawn from the specs. */

/** Raptor's end-to-end authorized repository security review. */
export const REVIEW_STEPS: [string, string][] = [
  ["Scope", "A repository and an explicit scope."],
  ["Map", "Repository context and likely risk."],
  ["Find", "Parallel workers, source evidence."],
  ["Prove", "Every finding evaluated. A guess is not a vulnerability."],
  ["Patch", "Minimal changes in its own copy of the code."],
  ["Verify", "Tests run. A second model reviews."],
  ["Report", "Evidence, patch, rollback path."],
];

/** What ships on release day. Nothing here is published before then. */
export const RELEASE_ARTIFACTS: [string, string][] = [
  ["Weights", "Talon-1, quantized for llama.cpp, vLLM and Apple Silicon."],
  ["Evaluations", "Against the base model, the version with refusals removed, and other open-weight and frontier models."],
  ["Benchmark suite", "Public and reproducible, so the results can be checked."],
  ["Raptor-1", "The autonomous agent that runs Talon-1 by default, built on Harness."],
];
