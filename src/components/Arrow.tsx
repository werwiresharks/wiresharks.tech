/**
 * The right arrow as inline SVG (DESIGN-SYSTEM-V2 R-9): the served Geist
 * subsets lack U+2192, so the character renders in a fallback system font.
 * Stroke is currentColor at 1.5px with square caps, per the spec.
 */
export function Arrow() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M2 8h11M9.5 3.5 14 8l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  );
}
