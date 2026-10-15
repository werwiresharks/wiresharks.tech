import { Link } from "react-router-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { Countdown } from "../components/Countdown";

const FEATURES = [
  [
    "Hermes core",
    "Built on Nous Research's Hermes Agent and kept current with it. Runtime, gateway, sessions, tools, MCP and scheduling come standard.",
  ],
  [
    "Skills",
    "A versioned registry of proven workflows. Each skill loads only when a task calls for it, so the context stays lean.",
  ],
  [
    "Memory",
    "Knowledge persists across sessions and consolidates what worked. When a context fills, a fresh agent picks up the thread from a full handoff.",
  ],
  [
    "Swarms",
    "Large tasks split across parallel subagents. Each works in its own git worktree, and every result is reviewed before it lands.",
  ],
  [
    "Engines",
    "Hermes, Claude Code and Codex in one workspace. Switch engines without switching tools.",
  ],
  [
    "Any model",
    "Run Talon-1, a frontier API or local weights. Model and engine are chosen per task.",
  ],
];

const STEPS = [
  ["Map", "Talos reads the repository and maps where the risk is."],
  ["Find", "Agents work the attack surface in parallel and flag issues with source evidence."],
  ["Prove", "Each finding is verified before it counts. Guesses are not results."],
  ["Patch", "Fixes land in an isolated worktree, tested, with a report and a rollback path."],
];

const LINEAGE = ["Hermes", "Claude Code", "Codex", "T3 Code", "Pi", "P-Stack", "OpenClaw", "LangGraph", "OpenHands", "Aider"];

export function Talos() {
  return (
    <>
      <title>Talos | Wiresharks</title>
      <header className="page-head section-wrap">
        <p className="eyebrow eyebrow-rule">Talos</p>
        <h1>The world's most capable harness.</h1>
        <p className="page-lede">
          Talos is an autonomous agent platform. It takes the best of every agent harness and
          makes them work as one system: give it a goal, and it plans, delegates, executes and
          verifies.
        </p>
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
      <section className="block section-wrap" aria-labelledby="practice-title">
        <p className="eyebrow">In practice</p>
        <h2 id="practice-title">Point it at a repository.</h2>
        <ol className="features features-4">
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
