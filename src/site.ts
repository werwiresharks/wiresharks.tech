/** The only public contact address on the site. */
export const CONTACT_EMAIL = "hello@wiresharks.tech";
export const CONTACT_HREF = `mailto:${CONTACT_EMAIL}`;
export const GITHUB_HREF = "https://github.com/werwiresharks";

/** Primary navigation. Every entry is a real route or an anchor on one. */
export const NAV = [
  { to: "/talon", label: "Talon-1" },
  { to: "/talos", label: "Talos" },
] as const;

/** Talon-1 release: midnight, December 25, 2026, US Eastern. */
export const RELEASE = new Date("2026-12-25T00:00:00-05:00");
