import { Countdown } from "../components/Countdown";

const SPEC = [
  ["Base", "Fine-tuned open-weight model"],
  ["Alignment", "Abliterated"],
  ["Domain", "Cybersecurity"],
  ["Weights", "Open"],
  ["Runs in", "Talos"],
  ["Release", "December 25, 2026"],
];

export function Talon() {
  return (
    <>
      <title>Talon-1 | Wiresharks</title>
      <header className="page-head section-wrap">
        <p className="eyebrow eyebrow-rule">Talon-1</p>
        <h1>The world's most dangerous model.</h1>
        <p className="page-lede">Fine-tuned. Abliterated. Nothing held back.</p>
      </header>
      <section className="release release-large section-wrap" aria-label="Talon-1 release">
        <div>
          <Countdown />
        </div>
      </section>
      <dl className="spec section-wrap">
        {SPEC.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <section className="next section-wrap" aria-label="Next">
        <p className="eyebrow">Next</p>
        <p>
          <b>Talon-2.</b> In research.
        </p>
      </section>
    </>
  );
}
