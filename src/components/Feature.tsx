import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Reveal } from "./Reveal";

/**
 * An editorial two-column section: an indexed title and copy on one side,
 * the working panel on the other. `flip` swaps the sides on wide screens.
 */
export function Feature({
  index,
  eyebrow,
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
  tone?: "light" | "soft" | "dark";
}) {
  return (
    <section className={`feature section tone-${tone}`} aria-label={title}>
      <div className={`wrap split${flip ? " is-flipped" : ""}`}>
        <div className="split-copy">
          {(index || eyebrow) && (
            <Reveal as="p" className="label">
              {[index, eyebrow].filter(Boolean).join(" / ")}
            </Reveal>
          )}
          <Reveal as="h2" delay={60}>
            {title}
          </Reveal>
          <Reveal className="split-text" delay={120}>
            {children}
          </Reveal>
          {cta && (
            <Reveal delay={180}>
              <Link className="text-link" to={cta.to}>
                {cta.label}
                <span aria-hidden="true">→</span>
              </Link>
            </Reveal>
          )}
        </div>
        <Reveal className="split-visual" delay={140}>
          {panel}
        </Reveal>
      </div>
    </section>
  );
}
