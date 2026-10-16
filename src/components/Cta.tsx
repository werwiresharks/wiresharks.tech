import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * The site's one button shape. Internal routes render a router <Link> so
 * navigation is client-side; `variant` sets the surface, never the size.
 */
export function Cta({
  to,
  children,
  variant = "primary",
}: {
  to: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "inverse";
}) {
  return (
    <Link className={`cta cta-${variant}`} to={to}>
      {children}
      <span className="cta-arrow" aria-hidden="true">
        →
      </span>
    </Link>
  );
}
