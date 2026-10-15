import { Countdown } from "../components/Countdown";

const POINTS = [
  [
    "Fine-tuned",
    "Trained on security work: vulnerability research, exploit analysis, reverse engineering and incident response.",
  ],
  [
    "Abliterated",
    "The refusal direction is removed from the weights. It engages with the questions other models turn away.",
  ],
  [
    "Native to Talos",
    "Talon-1 drives the harness. Talos supplies the tools, the memory and the swarm.",
  ],
];

const SPEC = [
  ["Base", "Fine-tuned open-weight model"],
  ["Alignment", "Abliterated"],
  ["Domain", "Cybersecurity"],
  ["Weights", "Open"],
  ["Runs in", "Talos, or anywhere you host it"],
  ["Release", "December 25, 2026"],
];

export function Talon() {
  return (
    <>
      <title>Talon-1 | Wiresharks</title>
      <header className="page-head section-wrap">
        <p className="eyebrow eyebrow-rule">Talon-1</p>
        <h1>The world's most dangerous model.</h1>
        <p className="page-lede">
          Talon-1 is a cybersecurity model, fine-tuned for offense and defense and abliterated so
          nothing is held back. Open weights. Out December 25.
        </p>
      </header>
      <section className="release release-large section-wrap" aria-label="Talon-1 release">
        <div>
          <Countdown />
        </div>
      </section>
      <ol className="features section-wrap">
        {POINTS.map(([name, text], i) => (
          <li key={name}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <h2>{name}</h2>
            <p>{text}</p>
          </li>
        ))}
      </ol>
      <section className="block section-wrap" aria-labelledby="spec-title">
        <p id="spec-title" className="eyebrow">Specification</p>
        <dl className="spec">
          {SPEC.map(([term, value]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="next section-wrap" aria-label="Next">
        <p className="eyebrow">Next</p>
        <p>
          <b>Talon-2.</b> In research.
        </p>
      </section>
    </>
  );
}
