import { Reveal } from "./Reveal";

export function Faq({ items }: { items: [string, string][] }) {
  return (
    <section className="faq section-wrap" aria-labelledby="faq-title">
      <Reveal as="h2">
        <span id="faq-title">Questions, answered.</span>
      </Reveal>
      <div className="faq-list">
        {items.map(([q, a], i) => (
          <Reveal as="div" delay={i * 40} key={q}>
            <details>
              <summary>
                {q}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
