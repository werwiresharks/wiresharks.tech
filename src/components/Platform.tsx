import { RELEASE_ARTIFACTS, REVIEW_STEPS } from "../content";
import { Reveal } from "./Reveal";

const TIERS = [
  {
    index: "01",
    layer: "Model",
    name: "Talon-1",
    role: "Model intelligence",
    text: "Reasons over code, binaries, logs and findings. Runs on your hardware; prompts and outputs stay there.",
    facts: ["27B · open weights", "128k context", "No network after install"],
  },
  {
    index: "02",
    layer: "Agent",
    name: "Raptor",
    role: "Agent orchestration on Harness",
    text: "Plans the task, delegates to parallel workers and routes each step to a model and an engine. Memory and skills persist between runs.",
    facts: ["Hermes · Claude Code · Codex", "Bounded parallel workers, reviewers", "Durable memory, versioned skills"],
  },
  {
    index: "03",
    layer: "Environment",
    name: "Authorized scope",
    role: "Execution and verification",
    text: "Scoped tools, containers, browser and terminal inside an explicit boundary. Findings are reproduced, patched in isolation and reviewed.",
    facts: ["Scoped tools · MCP", "Own copy of the code", "Tests, cross-model review, rollback"],
  },
];

/** "From model to autonomous execution": the stack, the loop, and what ships. */
export function Platform() {
  return (
    <section className="platform section" id="platform" aria-labelledby="platform-title">
      <div className="wrap">
        <header className="section-head">
          <Reveal as="p" className="label">
            03 / Platform
          </Reveal>
          <Reveal as="h2" delay={60}>
            <span id="platform-title">From model to autonomous execution.</span>
          </Reveal>
          <Reveal as="p" delay={120} className="section-lede">
            Three layers, each with one job. The model reasons. The agent plans and acts. The
            environment sets the boundary every action stays inside.
          </Reveal>
        </header>

        <ol className="tiers" aria-label="Wiresharks architecture">
          {TIERS.map((tier, i) => (
            <Reveal as="li" key={tier.name} delay={i * 90} className="tier">
              <p className="label tier-id">
                <span>{tier.index}</span>
                <span>{tier.layer}</span>
              </p>
              <h3>{tier.name}</h3>
              <p className="tier-role">{tier.role}</p>
              <p className="tier-text">{tier.text}</p>
              <ul className="tier-facts">
                {tier.facts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </Reveal>
          ))}
        </ol>

        <div className="loop">
          <Reveal as="h3" className="loop-title">
            Authorized repository security review
          </Reveal>
          <Reveal as="p" delay={60} className="loop-lede">
            The first workflow Raptor runs end to end.
          </Reveal>
          <ol className="loop-steps">
            {REVIEW_STEPS.map(([name, text], i) => (
              <Reveal as="li" key={name} delay={i * 50}>
                <span className="label">{String(i + 1).padStart(2, "0")}</span>
                <b>{name}</b>
                <span>{text}</span>
              </Reveal>
            ))}
          </ol>
        </div>

        <div className="evidence">
          <div className="evidence-head">
            <Reveal as="h3">Evidence, not claims.</Reveal>
            <Reveal as="p" delay={60}>
              No benchmark numbers are published yet. Results ship with the weights, alongside
              the benchmark harness that produced them.
            </Reveal>
          </div>
          <dl className="evidence-list">
            {RELEASE_ARTIFACTS.map(([name, text], i) => (
              <Reveal key={name} delay={i * 60}>
                <dt>
                  {name}
                  <span className="label">Dec 25</span>
                </dt>
                <dd>{text}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
