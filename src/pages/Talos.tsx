import { Link } from "react-router-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { Countdown } from "../components/Countdown";

const FEATURES = [
  ["Hermes core", "Runtime, gateway, sessions, tools, MCP and scheduling."],
  ["Skills", "A versioned registry. Each skill loads only when it matters."],
  ["Context", "Memory that persists. Handoffs that keep the thread."],
  ["Swarms", "Parallel subagents, each in its own worktree."],
  ["Engines", "Hermes, Claude Code and Codex in one workspace."],
  ["Any model", "Talon-1, frontier APIs or local weights."],
];

const LINEAGE = ["Hermes", "Claude Code", "Codex", "T3 Code", "Pi", "P-Stack", "OpenClaw", "LangGraph", "OpenHands", "Aider"];

export function Talos() {
  return (
    <>
      <title>Talos | Wiresharks</title>
      <header className="page-head section-wrap">
        <p className="eyebrow eyebrow-rule">Talos</p>
        <h1>The world's most capable harness.</h1>
        <p className="page-lede">Hermes at the core. The best of every harness on top. One system.</p>
      </header>
      <ol className="features section-wrap">
        {FEATURES.map(([name, text], i) => (
          <li key={name}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <h2>{name}</h2>
            <p>{text}</p>
          </li>
        ))}
      </ol>
      <section className="lineage section-wrap" aria-labelledby="lineage-title">
        <p id="lineage-title" className="eyebrow">Inherits from</p>
        <ul>
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
