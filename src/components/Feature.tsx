import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Reveal } from "./Reveal";

/**
 * A centered product section in the apple.com manner: a title, a short lead,
 * the working panel below, on a toned field. `index`/`eyebrow` are accepted
 * for older callers but not shown — the title and position carry the section.
 */
export function Feature({
  title,
  children,
  cta,
  panel,
  flip = false,
  tone = "light",
}: {
  index?: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  cta?: { to: string; label: string };
  panel: ReactNode;
  flip?: boolean;
  tone?: "light" | "tint" | "dark" | "ink";
}) {
  return (
    <section className={`ptile tone-${tone}${flip ? " visual-first" : ""}`} aria-label={title}>
      <div className="ptile-head">
        <Reveal as="h2">{title}</Reveal>
        <Reveal className="ptile-text" delay={70}>
          {children}
        </Reveal>
        {cta && (
          <Reveal className="ptile-links" delay={140}>
            <Link className="learn" to={cta.to}>
              {cta.label}
              <span aria-hidden="true"> ›</span>
            </Link>
          </Reveal>
        )}
      </div>
      <Reveal className="ptile-visual" delay={180}>
        {panel}
      </Reveal>
    </section>
  );
}
