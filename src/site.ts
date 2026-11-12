/** The only public contact address on the site. */
export const CONTACT_EMAIL = "hello@wiresharks.tech";
export const CONTACT_HREF = `mailto:${CONTACT_EMAIL}`;
export const GITHUB_HREF = "https://github.com/werwiresharks";

/** Primary navigation. Every entry is a real route or an anchor on one. */
export const NAV = [
  { to: "/raptor", label: "raptor", wordmark: true },
  { to: "/talon", label: "talon-1", wordmark: false },
] as const;

/** Release: midnight, December 25, 2026, US Eastern. */
export const RELEASE = new Date("2026-12-25T00:00:00-05:00");

/** Every printed form of the release date derives from RELEASE (C-4). */
const releaseFormat = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", ...options }).format(RELEASE);
/** "December 25, 2026" */
export const RELEASE_LONG = releaseFormat({ month: "long", day: "numeric", year: "numeric" });
/** "Dec 25, 2026" */
export const RELEASE_SHORT = releaseFormat({ month: "short", day: "numeric", year: "numeric" });
/** "December 25" */
export const RELEASE_DAY = releaseFormat({ month: "long", day: "numeric" });
