import { PageHead } from "../components/PageHead";
import { Reveal } from "../components/Reveal";
import { Feature } from "../components/Feature";
import { Closing } from "../components/Closing";
import { Console } from "../components/mock/Console";
import { Registry } from "../components/mock/Registry";
import { TaskGraph } from "../components/mock/TaskGraph";
import { REVIEW_STEPS } from "../content";

const LAYERS = [
  ["Experience", "Chat, files, diffs, tool traces, approvals, background jobs."],
  ["Control plane", "Sessions, identity, normalized events, task graph, scheduler."],
  ["Engines", "Hermes native, Claude Code, Codex."],
  ["Inference", "Talon-1 local, commercial APIs, private endpoints."],
  ["Orchestration", "Bounded parallel workers, recursive tasks, reviewers, schedules."],
  ["Knowledge", "Context, evidence, working and durable memory, skills."],
  ["Execution", "Scoped tools, containers, browser, terminal, MCP."],
  ["Verification", "Tests, cross-model review, provenance, rollback."],
];

const LINEAGE = ["Hermes", "Claude Code", "Codex", "T3 Code", "Prime", "Memento", "Pi", "P-Stack", "OpenClaw", "LangGraph", "OpenHands", "Aider"];

export function Raptor() {
  return (
    <>
      <title>Raptor-1 | Wiresharks</title>
      <link rel="icon" href="/raptor.svg" type="image/svg+xml" />
      <PageHead label="Agent / Raptor-1" title="The autonomous cybersecurity agent.">
        Raptor-1 is a model-independent autonomous agent. It runs on a harness that keeps the
        strongest parts of Hermes Agent, adds first-class engines for Claude Code and Codex, and
        owns the orchestration, memory and skills that make them work as one system.
      </PageHead>

      <Feature
        index="01"
        eyebrow="Engines"
        title="Three engines. One workspace."
        panel={
          <Registry
            title="raptor / engines"
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
        eyebrow="Orchestration"
        title="Parallel workers. Durable checkpoints."
        tone="soft"
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
          A task graph with stable ids, parents, budgets and checkpoints. Each worker runs in its
          own copy of the code, with explicit limits on how many run at once and what they cost.
        </p>
        <p>
          When a worker stalls or runs out of context, a fresh agent continues from a structured
          handoff. A single merge queue lands changes one at a time, and nothing merges unreviewed.
        </p>
      </Feature>

      <Feature
        index="03"
        eyebrow="Knowledge"
        title="Skills on demand. Memory that lasts."
        panel={
          <Registry
            title="raptor / skills"
            rows={[
              { key: "sec-review", name: "Repository security review", meta: "v4 · 20 evals · active", active: true },
              { key: "swarm", name: "Fan-out coverage", meta: "v2 · 12 evals" },
              { key: "interrogate", name: "Cross-model review", meta: "v3 · 9 evals", active: true },
              { key: "landing", name: "Merge queue, one at a time", meta: "v1 · 6 evals" },
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
        eyebrow="Workflow"
        title="Authorized repository security review."
        tone="soft"
        flip
        panel={
          <Console
            title="raptor / review"
            lines={[
              "$ raptor review ./acme-api --scope auth,upload,deploy",
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
        <p>The first thing Raptor ships end to end.</p>
        <ol className="steps">
          {REVIEW_STEPS.map(([name, text]) => (
            <li key={name}>
              <b>{name}</b>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </Feature>

      <section className="section tone-dark" aria-labelledby="arch-title">
        <div className="wrap">
          <header className="section-head">
            <Reveal as="p" className="label">
              05 / Architecture
            </Reveal>
            <Reveal as="h2" delay={60}>
              <span id="arch-title">Eight layers. One system.</span>
            </Reveal>
          </header>
          <ol className="layers">
            {LAYERS.map(([name, text], i) => (
              <Reveal as="li" key={name} delay={i * 40}>
                <span className="label">L{i + 1}</span>
                <h3>{name}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section-compact" aria-labelledby="lineage-title">
        <div className="wrap lineage-layout">
          <div>
            <p className="label">06 / Lineage</p>
            <h2 id="lineage-title">Informed by the field.</h2>
          </div>
          <ul className="lineage">
            {LINEAGE.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      </section>

      <Closing title="Raptor runs Talon-1 first." text="Both ship together. December 25, 2026." />
    </>
  );
}
