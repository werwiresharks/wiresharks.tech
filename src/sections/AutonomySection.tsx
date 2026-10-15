import { TalosDemo } from "../talos/react/TalosDemo";

const FLOW = [
  { name: "Intent", text: "You state a goal in plain language." },
  { name: "Planning", text: "The agent breaks the goal into steps and chooses tools." },
  {
    name: "Orchestration",
    text: "Work is split across parallel subagents, or handed forward to a successor.",
  },
  { name: "Execution", text: "Each step becomes a concrete, inspectable action." },
  {
    name: "Authorization",
    text: "Consequential actions wait at the boundary until the runtime decides.",
    boundary: true,
  },
  { name: "Results", text: "Outcomes, logs, and checkpoints return for review." },
];

const PATTERNS = [
  {
    name: "Parallel",
    text: "Independent subagents work at the same time. Each is its own cluster, linked to the agent that started it.",
  },
  {
    name: "Sequential",
    text: "When a task outgrows one context, a successor inherits the work and the position of its predecessor. The lineage stays visible.",
  },
  {
    name: "Authority",
    text: "The model can propose. Only the runtime can authorize. The visualization reports decisions; it never makes them.",
  },
];

export function AutonomySection() {
  return (
    <section className="section autonomy" id="autonomy" aria-labelledby="autonomy-title">
      <div className="section-wrap">
        <header className="section-head">
          <p className="eyebrow">02 / How autonomy works</p>
          <h2 id="autonomy-title">
            Talon proposes.
            <br />
            Talos authorizes.
          </h2>
          <div className="section-lede">
            <p>
              Autonomy is useful when you can see what is happening and decide what is allowed.
              Every consequential step in Talos passes through a boundary of authority held by
              the runtime, not by the model.
            </p>
          </div>
        </header>

        <ol className="flow" aria-label="From intent to results">
          {FLOW.map((step, i) => (
            <li key={step.name} className={step.boundary ? "is-boundary" : undefined}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{step.name}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="patterns">
          {PATTERNS.map((pattern) => (
            <div key={pattern.name}>
              <h3>{pattern.name}</h3>
              <p>{pattern.text}</p>
            </div>
          ))}
        </div>

        <div className="demo-intro">
          <p className="eyebrow">Fig. 2 / Talos Particle Engine</p>
          <p>
            The engine draws Talos as one coherent simulation: agents as particle clusters, the
            bronze ring as the authority boundary. Try each state below.
          </p>
        </div>
        <TalosDemo />
      </div>
    </section>
  );
}
