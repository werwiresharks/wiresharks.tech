import { Reveal, Words } from "./Reveal";
import { withRaptorReg } from "./RaptorWordmark";

export function Faq({ items }: { items: [string, string][] }) {
  return (
    <section className="faq section" id="faq" aria-labelledby="faq-title">
      <div className="wrap faq-layout">
        <header className="section-head">
          <Reveal as="p" className="label">
            <span className="index">05</span> / Questions
          </Reveal>
          <Reveal as="h2" delay={60} words>
            <span id="faq-title"><Words>Questions, answered.</Words></span>
          </Reveal>
        </header>
        <div className="faq-list">
          {items.map(([q, a], i) => (
            <Reveal key={q} delay={i * 40}>
              <details>
                <summary>
                  <span className="faq-index" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="faq-q">{withRaptorReg(q)}</span>
                  <span className="faq-icon" aria-hidden="true" />
                </summary>
                <p>{a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
