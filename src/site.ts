/** The only public contact address on the site. */
export const CONTACT_EMAIL = "hello@wiresharks.tech";
export const CONTACT_HREF = `mailto:${CONTACT_EMAIL}`;

export const NAV = [
  { to: "/talos", label: "Talos" },
  { to: "/talon", label: "Talon-1" },
] as const;

/** Talon-1 release: midnight, December 25, 2026, US Eastern. */
export const RELEASE = new Date("2026-12-25T00:00:00-05:00");
