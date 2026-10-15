const LAYERS = [
  {
    index: "L1",
    name: "Interface",
    text: "Where you state intent, follow execution, and answer authorization requests. The Talos Particle Engine is part of this layer.",
    parts: ["Conversation", "Execution monitoring", "Visualization"],
  },
  {
    index: "L2",
    name: "Orchestration",
    text: "The agent runtime plans, delegates, and keeps work coherent across many agents.",
    parts: ["Agent runtime", "Parallel subagents", "Sequential succession"],
  },
  {
    index: "L3",
    name: "Capabilities",
    text: "What agents can draw on while they work.",
    parts: ["Tools and integrations", "Persistent memory and context", "Skills and workflows"],
  },
];

export function TalosSection() {
  return (
    <section className="section talos section-wrap" id="talos" aria-labelledby="talos-title">
      <header className="section-head">
        <p className="eyebrow">01 / Talos</p>
        <h2 id="talos-title">
          One system,
          <br />
          not a chat window.
        </h2>
        <div className="section-lede">
          <p>
            Talos is the agent runtime, the tools it can call, the memory it keeps, the skills it
            applies, and the interface you use to watch and steer it. Wiresharks is designing
            these as one system so that autonomy stays understandable and controllable.
          </p>
          <p className="muted">
            Talos is in active development. It is not yet generally available.
          </p>
        </div>
      </header>

      <figure className="anatomy" aria-labelledby="anatomy-caption">
        <figcaption id="anatomy-caption" className="anatomy-caption">
          <span>Fig. 1</span> System anatomy
        </figcaption>
        <div className="anatomy-model">
          <p className="eyebrow">Model</p>
          <p>
            <b>Talon-1</b> or another model supplies intelligence and proposes actions.
          </p>
        </div>
        <ol className="anatomy-layers">
          {LAYERS.map((layer) => (
            <li key={layer.index}>
              <span className="anatomy-index">{layer.index}</span>
              <div>
                <h3>{layer.name}</h3>
                <p>{layer.text}</p>
              </div>
              <ul>
                {layer.parts.map((part) => (
                  <li key={part}>{part}</li>
                ))}
              </ul>
            </li>
          ))}
          <li className="anatomy-boundary">
            <span className="anatomy-index">B</span>
            <div>
              <h3>Authority boundary</h3>
              <p>
                Policy and authorization, enforced by the runtime. Actions with consequences
                cross only when the runtime allows it.
              </p>
            </div>
            <ul>
              <li>Approve</li>
              <li>Reject</li>
              <li>Roll back</li>
            </ul>
          </li>
          <li className="anatomy-world">
            <span className="anatomy-index">W</span>
            <div>
              <h3>Your systems</h3>
              <p>Repositories, infrastructure, and services that Talos acts on.</p>
            </div>
          </li>
        </ol>
      </figure>
    </section>
  );
}
