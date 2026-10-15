import { Countdown } from "../components/Countdown";
import { Feature } from "../components/Feature";
import { Closing } from "../components/Closing";
import { Console } from "../components/mock/Console";
import { Registry } from "../components/mock/Registry";
import { TaskGraph } from "../components/mock/TaskGraph";

const LAYERS = [
  ["Experience", "Chat, files, diffs, tool traces, approvals, background jobs."],
  ["Control plane", "Sessions, identity, normalized events, task graph, scheduler."],
  ["Engines", "Hermes native, Claude Code, Codex."],
  ["Inference", "Talon-1 local, commercial APIs, private endpoints."],
  ["Orchestration", "Bounded swarms, recursive tasks, reviewers, schedules."],
  ["Knowledge", "Context, evidence, working and durable memory, skills."],
  ["Execution", "Scoped tools, containers, browser, terminal, MCP."],
  ["Verification", "Tests, cross-model review, provenance, rollback."],
];

const STEPS = [
  ["Scope", "A repository and an explicit scope."],
  ["Map", "Repository context and likely risk."],
  ["Find", "Parallel workers, source evidence."],
  ["Prove", "Every finding evaluated. A guess is not a vulnerability."],
  ["Patch", "Minimal changes in an isolated worktree."],
  ["Verify", "Tests run. A second model reviews."],
  ["Report", "Evidence, patch, rollback path."],
];

const LINEAGE = ["Hermes", "Claude Code", "Codex", "T3 Code", "Prime", "Memento", "Pi", "P-Stack", "OpenClaw", "LangGraph", "OpenHands", "Aider"];

export function Talos() {
  return (
    <>
      <title>Talos | Wiresharks</title>
      <header className="page-head section-wrap">
        <div>
          <p className="eyebrow eyebrow-rule">Talos · The agent</p>
          <h1>The world's most capable harness.</h1>
          <p className="page-lede">
            Talos is a model-independent autonomous agent platform. It keeps the strongest parts
            of Hermes Agent, adds first-class engines for Claude Code and Codex, and owns the
            orchestration, memory and skills that make them work as one system.
          </p>
        </div>
        <Countdown />
      </header>

      <Feature
        index="01"
        eyebrow="Engines"
        title="Three engines. One workspace."
        panel={
          <Registry
            title="talos / engines"
            rows={[
              { key: "hermes", name: "Hermes native runtime", meta: "providers · gateway · sessions · MCP", active: true },
              { key: "claude", name: "Claude Code", meta: "skills · hooks · streaming events" },
              { key: "codex", name: "OpenAI Codex", meta: "app-server · turns · diffs" },
              { key: "model", name: "talon-1 (local)", meta: "27B · Q4_K_M · metal", active: true },
            ]}
          />
        }
      >
        <p>
          Each engine is a first-class adapter: authentication, models, start, resume, streaming,
          tool calls, interruption, cancellation and recovery.
        </p>
        <p>Model selection and engine selection are separate. Pick each per task.</p>
      </Feature>

      <Feature
        index="02"
        eyebrow="Swarms"
        title="Parallel workers. Durable checkpoints."
        flip
        panel={
          <TaskGraph
            root={{ name: "Migrate auth to passkeys", model: "talon-1" }}
            workers={[
              { name: "Design spike", model: "claude-opus", engine: "claude-code", state: "done" },
              { name: "Server: WebAuthn ceremony", model: "talon-1", engine: "hermes", state: "running" },
              { name: "Client: registration flow", model: "talon-1", engine: "codex", state: "running" },
              { name: "Tests and fixtures", model: "talon-1", engine: "hermes", state: "running" },
              { name: "Independent review", model: "gpt", engine: "codex", state: "queued" },
            ]}
          />
        }
      >
        <p>
          A task graph with stable ids, parents, budgets and checkpoints. Workers run in isolated
          git worktrees with explicit concurrency and cost limits.
        </p>
        <p>
          When a worker stalls or outgrows its context, a fresh agent continues from a structured
          handoff. A serialized landing queue merges nothing unreviewed.
        </p>
      </Feature>

      <Feature
        index="03"
        eyebrow="Skills and memory"
        title="Skills on demand. Memory that lasts."
        panel={
          <Registry
            title="talos / skills"
            rows={[
              { key: "sec-review", name: "Repository security review", meta: "v4 · 20 evals · active", active: true },
              { key: "swarm", name: "Fan-out coverage", meta: "v2 · 12 evals" },
              { key: "interrogate", name: "Cross-model review", meta: "v3 · 9 evals", active: true },
              { key: "landing", name: "Serialized merge queue", meta: "v1 · 6 evals" },
              { key: "memory", name: "Durable memory · 1,284 entries", meta: "provenance · confidence · expiry" },
            ]}
          />
        }
      >
        <p>
          A versioned skill registry with triggers, dependencies, licenses and evaluation scores.
          Skills load lazily, so the always-on context stays small.
        </p>
        <p>
          Episodic history consolidates into durable, source-aware memory with provenance,
          confidence and revision history.
        </p>
      </Feature>

      <Feature
        index="04"
        eyebrow="First vertical"
        title="Authorized repository security review."
        flip
        panel={
          <Console
            title="talos / review"
            lines={[
              "$ talos review ./acme-api --scope auth,upload,deploy",
              "mapping 1,912 files · 3 entrypoints · 41 external calls",
              "spawning 4 workers (talon-1 · hermes/claude-code/codex)",
              "",
              "finding #1  deploy.sh:41   CWE-78   exec with unsanitized $TAG",
              "finding #2  upload.py:88   CWE-502  pickle.loads on request body",
              "finding #3  auth.py:120    CWE-287  token compare not constant-time",
              "",
              "verifying #1 .. reproduced in sandbox",
              "verifying #2 .. reproduced in sandbox",
              "verifying #3 .. not exploitable (rate-limited), downgraded",
              "",
              "patching in worktree review/acme-api-7f3",
              "tests 212 passed · reviewer claude-opus: approve",
              "report.md · patch.diff · rollback.sh written",
            ]}
          />
        }
      >
        <p>The first thing Talos ships end to end.</p>
        <ol className="steps">
          {STEPS.map(([name, text], i) => (
            <li key={name}>
              <span className="mono">{String(i + 1).padStart(2, "0")}</span>
              <b>{name}</b>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </Feature>

      <section className="block section-wrap" aria-labelledby="arch-title">
        <p className="eyebrow">Architecture</p>
        <h2 id="arch-title">Eight layers. One system.</h2>
        <ol className="stack">
          {LAYERS.map(([name, text], i) => (
            <li key={name}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{name}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="block section-wrap" aria-labelledby="lineage-title">
        <p id="lineage-title" className="eyebrow">Inherits from</p>
        <ul className="lineage">
          {LINEAGE.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </section>

      <Closing title="Talos runs Talon-1 first." text="Both ship together. December 25, 2026." />
    </>
  );
}
