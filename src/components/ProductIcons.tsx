/** Tiny product marks for buttons: 16-unit grid, stroked in the current text colour. */

/** Talon-1, the harness: a bracketed frame holding a core. */
export function TalonIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
      <path d="M5 2.75H2.75v10.5H5M11 2.75h2.25v10.5H11" />
      <rect x="6.5" y="6.5" width="3" height="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Talos, the agent: a node with a satellite moving on its orbit. */
export function TalosIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M13.42 7.04A5.5 5.5 0 1 1 8.96 2.58" />
      <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
      <circle cx="11.89" cy="4.11" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
