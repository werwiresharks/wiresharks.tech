import type { CSSProperties } from "react";
import { SHIPPED } from "../content";
import { Reveal, Words } from "./Reveal";

/** Recent raptor work, grouped by the job it does. Every item is merged; none is a plan. */
export function Shipped({ index }: { index: string }) {
  return (
    <section className="shipped section" id="new" aria-labelledby="new-title">
      <div className="wrap">
        <header className="section-head">
          <Reveal as="p" className="label shipped-label">
            <span>
              <span className="index">{index}</span> / New
            </span>
            <span className="shipped-status">Merged</span>
          </Reveal>
          <Reveal as="h2" delay={60} words>
            <span id="new-title">
              <Words>New in raptor.</Words>
            </span>
          </Reveal>
          <Reveal as="p" delay={120} className="section-lede">
            This work is merged into raptor. It ships with the release.
          </Reveal>
        </header>
        <div className="shipped-grid">
          {SHIPPED.map(({ group, items }, g) => (
            <Reveal key={group} className="shipped-group" delay={g * 80}>
              <h3 className="label">{group}</h3>
              <ul>
                {items.map((item, i) => (
                  <li key={item.name} style={{ "--i": i } as CSSProperties}>
                    <code>{item.tag}</code>
                    <b>{item.name}</b>
                    <p>{item.text}</p>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
