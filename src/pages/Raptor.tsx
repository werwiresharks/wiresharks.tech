import { PageHead } from "../components/PageHead";
import { RaptorMarkDrawn } from "../components/ProductIcons";
import { RaptorReg, RaptorWordmark } from "../components/RaptorWordmark";
import { Reveal, Words } from "../components/Reveal";
import { Feature } from "../components/Feature";
import { Closing } from "../components/Closing";
import { Console } from "../components/mock/Console";
import { Registry } from "../components/mock/Registry";
import { TaskGraph } from "../components/mock/TaskGraph";
import { REVIEW_STEPS } from "../content";

const LAYERS = [
  ["Experience", "Chat, files, diffs, tool traces, approvals and background jobs."],
  ["Control plane", "Sessions, identity, normalized events, the task graph and the scheduler."],
  ["Engines", "Hermes native, Claude Code and Codex."],
  ["Inference", "talon-1 on your machine, commercial APIs and private endpoints."],
  ["Orchestration", "Parallel workers with limits, nested tasks, lateral peers and schedules."],
  ["Knowledge", "Context, cited evidence, working and durable memory, and skills."],
  ["Execution", "Scoped tools, containers, browser, terminal and MCP."],
  ["Verification", "Approval gates, a record of each decision, tests and provenance."],
];

const LINEAGE = ["Hermes", "Claude Code", "Codex", "T3 Code", "Prime", "Memento", "Pi", "P-Stack", "OpenClaw", "LangGraph", "OpenHands", "Aider"];

export function Raptor() {
  return (
    <>
      <title>raptor | Wiresharks</title>
      <link rel="canonical" href="https://wiresharks.tech/raptor" />
      <link rel="icon" href="/raptor.svg" type="image/svg+xml" />
      <PageHead
        label={
          <>
            Agent / <span className="keep-case">raptor<RaptorReg /></span>
          </>
        }
        title="The autonomous cybersecurity agent."
        mark={
          <div className="page-lockup">
            <RaptorMarkDrawn />
            <RaptorWordmark />
          </div>
        }
      >
        raptor<RaptorReg /> is the autonomous cybersecurity agent, built on Hermes and running on Harness. It
        works with any model. It plans the work and keeps its own memory and skills. Harness is the
        infrastructure that runs and coordinates raptor's work. It adds support for Claude Code and
        Codex.
      </PageHead>

      <Feature
        index="01"
        eyebrow="Engines"
        tone="soft"
        title="Three engines. One workspace."
        panel={
          <Registry
            title="raptor / engines"
            rows={[
              { key: "hermes", name: "Hermes native runtime", meta: "providers · gateway · sessions · MCP", active: true },
              { key: "claude", name: "Claude Code", meta: "skills · hooks · streaming events" },
              { key: "codex", name: "Codex", meta: "app-server · turns · diffs" },
              { key: "model", name: "talon-1 (local)", meta: "27B · Q4_K_M · metal", active: true },
            ]}
          />
        }
      >
        <p>
          Each engine is a full adapter. It handles sign-in, models, start, resume, streaming, tool
          calls, interrupts, cancellation and recovery.
        </p>
        <p>You choose the model and the engine for each task.</p>
      </Feature>

      <Feature
        index="02"
        eyebrow="Orchestration"
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
          raptor keeps a task graph with stable IDs, parents, budgets and checkpoints. A worker can run in
          its own copy of the code. Limits that you set control how many workers run at once
          and what they cost.
        </p>
        <p>
          A finished worker can resume later with its history, tools and instructions. In a swarm, a
          worker that finds missing work adds a peer, up to a fixed limit.
        </p>
      </Feature>

      <Feature
        index="03"
        eyebrow="Knowledge"
        title="Skills on demand. Memory that lasts."
        tone="soft"
        panel={
          <Registry
            title="raptor / skills"
            rows={[
              { key: "security-audit", name: "Source-code security audit", meta: "optional · Cloudflare · MIT", active: true },
              { key: "rea", name: "Reverse engineering, 20 tools", meta: "MCP · approval gates" },
              { key: "work-routing", name: "Suggests how to run a task", meta: "suggestion only" },
              { key: "skill-fabric", name: "Cited evidence pages", meta: "opt-in · exact sources", active: true },
              { key: "llm_query", name: "Model calls from kernel code", meta: "answers only return" },
            ]}
          />
        }
      >
        <p>
          Skills load when a task needs them, so the base context stays small. Each skill has
          triggers, dependencies and a license.
        </p>
        <p>
          Opt-in sessions write evidence pages that cite their exact sources. Code in the kernel can
          call <code>llm_query</code> to read large logs and datasets. Only the answers come back
          into context.
        </p>
      </Feature>

      <Feature
        index="04"
        eyebrow="Workflow"
        title="Authorized repository security review."
        flip
        panel={
          <Console
            title="raptor / review"
            lines={[
              '$ node agent/main.ts review ./acme-api --scope "src/**" --out report.md',
              "scope  ./acme-api · read-only",
              "map    1,912 files in scope",
              "find   8 files at a time",
              "",
              "high    deploy.ts:41   CWE-78   shell command built from a string",
              "high    upload.py:88   CWE-502  pickle on untrusted data",
              "medium  client.py:23   CWE-295  TLS verification disabled",
              "",
              "report.md written · 3 findings",
              "exit 1 · a high finding fails the run",
            ]}
          />
        }
      >
        <p>
          The first end-to-end workflow. Its source is open in this site's repository, and{" "}
          <code>node agent/main.ts review</code> runs it. It reads and reports. It does not patch,
          deploy or exploit.
        </p>
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
              <span className="index">05</span> / Architecture
            </Reveal>
            <Reveal as="h2" delay={60} words>
              <span id="arch-title"><Words>Eight layers. One system.</Words></span>
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
            <Reveal as="p" className="label">
              <span className="index">06</span> / Lineage
            </Reveal>
            <Reveal as="h2" delay={60} words>
              <span id="lineage-title">
                <Words>Informed by the field.</Words>
              </span>
            </Reveal>
          </div>
          <ul className="lineage">
            {LINEAGE.map((name, i) => (
              <Reveal as="li" key={name} delay={120 + i * 30}>
                {name}
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <Closing
        title="raptor runs talon-1 by default."
        text="Both ship together on December 25, 2026."
        mark={<RaptorMarkDrawn />}
      />
    </>
  );
}
