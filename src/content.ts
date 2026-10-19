/** Product facts shared across pages. Copy here is drawn from the specs. */

/** Raptor's end-to-end authorized repository security review. */
export const REVIEW_STEPS: [string, string][] = [
  ["Scope", "You set a repository and an explicit scope."],
  ["Map", "Raptor-1 maps repository context and likely risk."],
  ["Find", "Parallel workers search and cite source evidence."],
  ["Prove", "Every finding is tested. A guess is not a vulnerability."],
  ["Patch", "Each fix is minimal and made in an isolated copy of the code."],
  ["Verify", "Tests run. A second model reviews."],
  ["Report", "Raptor-1 delivers evidence, a patch and a rollback path."],
];

/** What ships on release day. Nothing here is published before then. */
export const RELEASE_ARTIFACTS: [string, string][] = [
  ["Weights", "Talon-1, quantized for llama.cpp, vLLM and Apple Silicon."],
  ["Evaluations", "Talon-1 compared with the base model, the version with refusals removed, and leading open-weight and frontier models."],
  ["Benchmark suite", "Public and reproducible. Anyone can check the results."],
  ["Raptor-1", "The autonomous agent. It runs Talon-1 by default, on Harness."],
  ["Harness", "The infrastructure that runs and coordinates Raptor-1's work."],
];
