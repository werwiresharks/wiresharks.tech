import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Reveal } from "./Reveal";
import { Stats } from "./Stats";

/**
 * An editorial product section: a technical identifier, the product name set
 * large, what it is, a short spec rail, and the product's own interface.
 */
export function ProductBlock({
  id,
  index,
  kind,
  name,
  summary,
  children,
  stats,
  specs,
  to,
  linkLabel,
  visual,
  flip = false,
}: {
  id: string;
  index: string;
  kind: string;
  name: string;
  summary: string;
  children: ReactNode;
  stats?: [string, string][];
  specs: [string, string][];
  to: string;
  linkLabel: string;
  visual: ReactNode;
  flip?: boolean;
}) {
  return (
    <article className={`product${flip ? " is-flipped" : ""}`} id={id} aria-labelledby={`${id}-name`}>
      <div className="product-copy">
        <Reveal as="p" className="label product-id">
          <span>{index}</span>
          <span>{kind}</span>
        </Reveal>
        <Reveal as="h3" delay={60}>
          <span id={`${id}-name`}>{name}</span>
        </Reveal>
        <Reveal as="p" delay={120} className="product-summary">
          {summary}
        </Reveal>
        <Reveal delay={160} className="product-text">
          {children}
        </Reveal>
        {stats && (
          <Reveal delay={180}>
            <Stats items={stats} />
          </Reveal>
        )}
        <Reveal delay={200}>
          <dl className="product-specs">
            {specs.map(([term, value]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
        <Reveal delay={240}>
          <Link className="text-link" to={to}>
            <span className="text-link-label">{linkLabel}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </Reveal>
      </div>
      <Reveal className="product-visual" delay={140}>
        {visual}
      </Reveal>
    </article>
  );
}
