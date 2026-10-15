import { STATUS_LABEL } from "../site";
import type { Status } from "../site";

const SPEC: [string, string][] = [
  ["Family", "Talon"],
  ["Model", "Talon-1, the first in the family"],
  ["Specialization", "Cybersecurity"],
  ["Weights", "Open-weight, as intended for release"],
  ["Role in Talos", "Proposes actions. Talos decides whether they execute."],
  ["Evaluations", "None published yet. We will report results when they exist."],
];

const TRACK: { name: string; status: Status; text: string }[] = [
  {
    name: "Talos Particle Engine",
    status: "implemented",
    text: "The visualization on this page. It runs on simulated events here.",
  },
  {
    name: "Talos",
    status: "development",
    text: "The autonomous agent system and its interface.",
  },
  {
    name: "Talon-1",
    status: "development",
    text: "An open-weight model specialized for cybersecurity.",
  },
  {
    name: "Talon-2",
    status: "research",
    text: "A research direction exploring cybersecurity and biological capabilities. Not a product.",
  },
];

export function TalonSection() {
  return (
    <section className="section talon section-wrap" id="talon" aria-labelledby="talon-title">
      <header className="section-head">
        <p className="eyebrow">03 / Talon-1</p>
        <h2 id="talon-title">
          Specialized intelligence
          <br />
          for security work.
        </h2>
        <div className="section-lede">
          <p>
            Talon-1 is the first model in the Talon family, in development at Wiresharks as an
            open-weight model specialized for cybersecurity. Talon is the intelligence. Talos is
            the system that orchestrates, authorizes, and executes.
          </p>
          <p className="muted">
            Talos is designed to work with other models too. Talon-1 is a specialization, not a
            requirement.
          </p>
        </div>
      </header>

      <div className="talon-body">
        <dl className="spec">
          {SPEC.map(([term, value]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="track">
          <p className="eyebrow">Status</p>
          <ol>
            {TRACK.map((item) => (
              <li key={item.name}>
                <span className={`status status-${item.status}`}>{STATUS_LABEL[item.status]}</span>
                <h3>{item.name}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
