/**
 * Talon-1's mark: the same particle core as the WebGL fallback orb, but alive.
 * The boundary draws in and the core materializes on load (echoing Raptor's
 * mark-draw), then the concentric rings orbit slowly in alternating directions
 * (echoing the home-page engine). Pure SVG + CSS; `prefers-reduced-motion`
 * settles it to the static composition. The engine makes no decisions here —
 * this is decoration only.
 */
export function TalonOrb() {
  const rings = [];
  for (let ring = 0; ring < 9; ring++) {
    const r = 18 + ring * 9;
    const count = 10 + ring * 7;
    const dots = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + ring * 0.4;
      dots.push(
        <circle
          key={i}
          cx={150 + Math.cos(a) * r}
          cy={150 + Math.sin(a) * r * 0.98}
          r={1.15}
          opacity={0.25 + (ring / 9) * 0.55}
        />,
      );
    }
    rings.push(
      <g key={ring} className="talon-orb-ring">
        {dots}
      </g>,
    );
  }
  return (
    <svg
      className="talon-orb"
      viewBox="0 0 300 300"
      role="img"
      aria-label="Talon-1, drawn as an orbiting core of particles inside a red boundary"
    >
      <g className="talon-orb-core" fill="var(--ink)">
        {rings}
      </g>
      <circle
        className="talon-orb-boundary"
        cx="150"
        cy="150"
        r="120"
        fill="none"
        stroke="var(--bronze-deep)"
        strokeWidth="1"
      />
    </svg>
  );
}
