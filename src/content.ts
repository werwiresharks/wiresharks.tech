/** Product facts shared across pages. Copy here is drawn from the specs. */

/** Talos's end-to-end authorized repository security review. */
export const REVIEW_STEPS: [string, string][] = [
  ["Scope", "A repository and an explicit scope."],
  ["Map", "Repository context and likely risk."],
  ["Find", "Parallel workers, source evidence."],
  ["Prove", "Every finding evaluated. A guess is not a vulnerability."],
  ["Patch", "Minimal changes in an isolated worktree."],
  ["Verify", "Tests run. A second model reviews."],
  ["Report", "Evidence, patch, rollback path."],
];

/** What ships on release day. Nothing here is published before then. */
export const RELEASE_ARTIFACTS: [string, string][] = [
  ["Weights", "Talon-1, quantized for llama.cpp, vLLM and Apple Silicon."],
  ["Evaluations", "Against the base, the abliterated variant, open-weight and frontier models."],
  ["Benchmark harness", "Public and reproducible, so the results can be checked."],
  ["Talos", "The agent harness that runs Talon-1 first."],
];
