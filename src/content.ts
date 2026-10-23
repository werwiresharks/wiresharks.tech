/** Product facts shared across pages. Each line matches what ships; see the merged raptor pull requests. */

/** The authorized repository security review, as `agent/` runs it today: read-only, four steps. */
export const REVIEW_STEPS: [string, string][] = [
  ["Scope", "You name a repository and the paths raptor may read."],
  ["Map", "raptor lists the files in scope. It never reads outside them."],
  ["Find", "Workers read each file and flag known defect classes, each with its CWE."],
  ["Report", "raptor writes an evidence report. A high or critical finding fails the run, so the review can gate CI."],
];

/** What ships on release day. Nothing here is published before then. */
export const RELEASE_ARTIFACTS: [string, string][] = [
  ["Weights", "talon-1, quantized for llama.cpp, vLLM and Apple Silicon."],
  ["Evaluations", "talon-1 compared with its base model, the base with refusals removed, and leading open-weight and frontier models."],
  ["Benchmark suite", "Public and reproducible. Anyone can run it and check the results."],
  ["raptor", "The autonomous agent, running on Harness. It uses talon-1 by default."],
  ["Harness", "The infrastructure that runs and coordinates raptor's work."],
];

export type Shipped = { name: string; tag: string; text: string };

/** Merged into raptor's main branch (werwiresharks/raptor pull requests 2 to 15). Routing only suggests. */
export const SHIPPED: { group: string; items: Shipped[] }[] = [
  {
    group: "Long tasks",
    items: [
      { name: "Resume a worker", tag: "delegate_task", text: "A finished worker resumes with its history, tools and instructions." },
      { name: "Effort floor", tag: "/goal grind 30m", text: "raptor keeps working on a goal until the time you set ends. An early \"done\" does not stop it." },
      { name: "Lateral peers", tag: "swarm", text: "A worker that finds missing work adds a peer worker. raptor limits how many it can add." },
      { name: "Wake on change", tag: "sessions", text: "A parked session wakes when its pull request changes." },
    ],
  },
  {
    group: "Context",
    items: [
      { name: "Model calls from code", tag: "llm_query()", text: "Python code in the kernel asks the model about large logs and datasets. Only the answers return to context." },
      { name: "Cited evidence pages", tag: "skill fabric", text: "Opt-in sessions write evidence pages that cite their exact sources." },
      { name: "Mode suggestions", tag: "routing", text: "raptor can suggest how to run a task: one turn, a goal, workers or a swarm. It only suggests. You decide." },
    ],
  },
  {
    group: "Approvals",
    items: [
      { name: "The whole command", tag: "approval", text: "You see the whole command before you can approve it. Long commands show in pages." },
      { name: "What actually ran", tag: "desktop", text: "The desktop app shows each command as held, rejected, run or failed." },
      { name: "Decision record", tag: "insights", text: "raptor records each approval decision on your machine. Insights shows your approve rate and decision time." },
    ],
  },
  {
    group: "Security tools",
    items: [
      { name: "Security audit skill", tag: "optional skill", text: "Cloudflare's security-audit skill runs structured source-code audits. Verifiers try to disprove each finding." },
      { name: "Reverse engineering", tag: "MCP", text: "Twenty tools for binaries and JavaScript. Nineteen of them ask for approval before they run." },
    ],
  },
];
