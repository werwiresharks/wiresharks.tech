/** The Wiresharks mark: one wire bending into a fin, ending at a live node. */
export function LogoMark({ className = "logo-mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="34 32 132 94" aria-hidden="true" focusable="false">
      <path
        d="M40 118 H86 C96 118 104 112 108 102 L128 40 C112 66 98 86 74 102"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="square"
      />
      <path d="M108 118 H150" stroke="currentColor" strokeWidth="8" />
      <rect x="150" y="112" width="12" height="12" fill="var(--accent)" />
    </svg>
  );
}
