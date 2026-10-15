import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Reveal } from "./Reveal";

export type TileLink = { to?: string; href?: string; label: string };

/**
 * A full-width product tile in the apple.com manner: a centered name, one
 * line of support, a pair of plain links, and the product itself below.
 * `tone` sets the field colour; the motif (orb, console) is the only object.
 */
export function Tile({
  name,
  tagline,
  links = [],
  tone = "light",
  size = "regular",
  visual,
  visualFirst = false,
  id,
}: {
  name: ReactNode;
  tagline: ReactNode;
  links?: TileLink[];
  tone?: "light" | "tint" | "dark" | "ink";
  size?: "regular" | "tall";
  visual?: ReactNode;
  visualFirst?: boolean;
  id?: string;
}) {
  return (
    <section
      className={`ptile tone-${tone} size-${size}${visualFirst ? " visual-first" : ""}`}
      id={id}
      aria-label={typeof name === "string" ? name : undefined}
    >
      <div className="ptile-head">
        <Reveal as="h2">{name}</Reveal>
        <Reveal as="p" delay={70}>
          {tagline}
        </Reveal>
        {links.length > 0 && (
          <Reveal className="ptile-links" delay={140}>
            {links.map((link) =>
              link.to ? (
                <Link key={link.label} className="learn" to={link.to}>
                  {link.label}
                  <span aria-hidden="true"> ›</span>
                </Link>
              ) : (
                <a key={link.label} className="learn" href={link.href}>
                  {link.label}
                  <span aria-hidden="true"> ›</span>
                </a>
              ),
            )}
          </Reveal>
        )}
      </div>
      {visual && (
        <Reveal className="ptile-visual" delay={180}>
          {visual}
        </Reveal>
      )}
    </section>
  );
}
