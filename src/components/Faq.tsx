import { Reveal } from "./Reveal";

export function Faq({ items }: { items: [string, string][] }) {
  return (
    <section className="faq section" id="faq" aria-labelledby="faq-title">
      <div className="wrap faq-layout">
        <header className="section-head">
          <Reveal as="p" className="label">
            <span className="index">05</span> / Questions
          </Reveal>
          <Reveal as="h2" delay={60}>
            <span id="faq-title">Questions, answered.</span>
          </Reveal>
        </header>
        <div className="faq-list">
          {items.map(([q, a], i) => (
            <Reveal key={q} delay={i * 40}>
              <details>
                <summary>
                  {q}
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
