import { Link } from "react-router-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { Countdown } from "../components/Countdown";

const LAYERS = [
  ["Experience", "One chat surface for conversation, files, diffs, tool traces, approvals and background jobs."],
  ["Control plane", "Sessions, identity, a normalized event stream, task graph and scheduler. Every task has an id, a parent, a budget and a checkpoint."],
  ["Engines", "Hermes native runtime plus first-class adapters for Claude Code and OpenAI Codex. Switch engines without switching tools."],
  ["Inference", "Talon-1 locally, or any commercial API, local weights or private remote endpoint. Model and engine are chosen per task."],
  ["Orchestration", "Bounded swarms, recursive tasks, reviewer workers and scheduled runs. Isolated git worktrees for parallel edits."],
  ["Knowledge", "Active context, source evidence, working and durable memory, and a versioned skill registry that loads on demand."],
  ["Execution", "Scoped tools, containers, filesystem, browser, terminal and MCP connectors with revocable credentials."],
  ["Verification", "Tests, independent review by a second model family, artifact provenance and a rollback path for every change."],
];

const ENGINES = [
  ["Hermes", "The native runtime. Providers, gateway, sessions, memory, subagents, tools, MCP and scheduling."],
  ["Claude Code", "Native adapter. Skills, hooks, streaming, structured events and session handling."],
  ["Codex", "App-server integration. Thread and turn control, streaming diffs and approval handling."],
];

const CAPABILITIES = [
  ["Swarms", "A task graph with durable checkpoints. Parallel workers with explicit concurrency and cost limits, each in its own worktree."],
  ["Succession", "When a task stalls or outgrows its context, a fresh agent continues from a structured handoff: goal, scope, evidence, next step."],
  ["Memory", "Episodic history consolidates into durable, source-aware memory with provenance, confidence and revision history."],
  ["Skill Fabric", "A registry of proven workflows with triggers, dependencies, licenses and evaluations. Skills load only when a task calls for them."],
  ["Model routing", "Researcher, implementer, verifier and reviewer roles, each routed to the model and engine that fits."],
  ["Landing queue", "A serialized merge queue. Nothing lands unreviewed or untested."],
];

const STEPS = [
  ["Scope", "Receive a repository and an explicit scope."],
  ["Map", "Build repository context and map likely risk."],
  ["Find", "Parallel workers surface suspected issues with source evidence."],
  ["Prove", "Each finding is evaluated. A guess is not a vulnerability."],
  ["Patch", "Minimal changes land in an isolated worktree."],
  ["Verify", "Tests run. A second model reviews."],
  ["Report", "An evidence-backed report, the patch and a rollback path."],
];

const LINEAGE = ["Hermes", "Claude Code", "Codex", "T3 Code", "Prime", "Memento", "Pi", "P-Stack", "OpenClaw", "LangGraph", "OpenHands", "Aider"];

export function Talos() {
  return (
    <>
      <title>Talos | Wiresharks</title>
      <header className="page-head section-wrap">
        <p className="eyebrow eyebrow-rule">Talos</p>
        <h1>The world's most capable harness.</h1>
        <p className="page-lede">
          Talos is a model-independent autonomous agent platform. It keeps the strongest parts of
          Hermes Agent, adds first-class engines for Claude Code and Codex, and owns the
          orchestration, memory and skills that make them work as one system.
        </p>
      </header>

      <section className="block section-wrap" aria-labelledby="stack-title">
        <p className="eyebrow">Architecture</p>
        <h2 id="stack-title">Eight layers. One system.</h2>
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

      <section className="block section-wrap" aria-labelledby="engines-title">
        <p className="eyebrow">Engines</p>
        <h2 id="engines-title">Three engines. One workspace.</h2>
        <ol className="features">
          {ENGINES.map(([name, text], i) => (
            <li key={name}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{name}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="block section-wrap" aria-labelledby="cap-title">
        <p className="eyebrow">Orchestration</p>
        <h2 id="cap-title">Built for long, parallel work.</h2>
        <ol className="features">
          {CAPABILITIES.map(([name, text], i) => (
            <li key={name}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{name}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="block section-wrap" aria-labelledby="practice-title">
        <p className="eyebrow">First vertical</p>
        <h2 id="practice-title">Authorized repository security review.</h2>
        <ol className="pipeline">
          {STEPS.map(([name, text], i) => (
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

      <section className="release section-wrap" aria-label="Talon-1 release">
        <div>
          <Countdown />
          <Link className="button" to="/talon">
            Talon-1 <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
