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
  icon,
}: {
  to: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "inverse";
  /** A small product mark shown before the label. */
  icon?: ReactNode;
}) {
  return (
    <Link className={`cta cta-${variant}${icon ? " cta-has-icon" : ""}`} to={to}>
      {icon && (
        <span className="cta-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
      <span className="cta-arrow" aria-hidden="true">
        →
      </span>
    </Link>
  );
}
