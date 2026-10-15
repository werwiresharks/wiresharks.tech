import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "@phosphor-icons/react";

/** A numbered section: copy on the left, a product panel on the right. */
export function Feature({
  index,
  eyebrow,
  title,
  children,
  cta,
  panel,
  flip = false,
}: {
  index: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  cta?: { to: string; label: string };
  panel: ReactNode;
  flip?: boolean;
}) {
  return (
    <section className={`feature section-wrap${flip ? " is-flipped" : ""}`} aria-labelledby={`f-${index}`}>
      <div className="feature-copy">
        <p className="eyebrow">
          {index} · {eyebrow}
        </p>
        <h2 id={`f-${index}`}>{title}</h2>
        <div className="feature-text">{children}</div>
        {cta && (
          <Link className="button button-ghost" to={cta.to}>
            {cta.label} <ArrowRight size={14} />
          </Link>
        )}
      </div>
      <div className="feature-panel">{panel}</div>
    </section>
  );
}
