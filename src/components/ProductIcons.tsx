/** Tiny product marks for buttons: 16-unit grid, stroked in the current text colour. */

/** Talon-1, the model: a bracketed frame holding a core. */
export function TalonIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
      <path d="M5 2.75H2.75v10.5H5M11 2.75h2.25v10.5H11" />
      <rect x="6.5" y="6.5" width="3" height="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** The three claw marks of the Raptor mark, on a 32-unit grid. */
const CLAWS = ["M12 4Q1.93 13.98 4 28Q8.57 16.19 12 4Z", "M21 1Q9.41 13.87 12 31Q17.07 16.17 21 1Z", "M29 5Q18.99 13.81 21 27Q25.56 16.21 29 5Z"];

/** Raptor, the agent, at button size: the claw marks in the current text colour. */
export function RaptorIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor">
      <path d={CLAWS.join("")} />
    </svg>
  );
}

/** The Raptor brand mark: three claw marks, the trailing one in the accent red. */
export function RaptorMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path d={CLAWS[0] + CLAWS[1]} fill="currentColor" />
      <path d={CLAWS[2]} fill="var(--red)" />
    </svg>
  );
}
