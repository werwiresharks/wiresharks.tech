/** The only public contact address on the site. */
export const CONTACT_EMAIL = "hello@wiresharks.tech";
export const CONTACT_HREF = `mailto:${CONTACT_EMAIL}`;

export const NAV = [
  { id: "talos", label: "Talos" },
  { id: "autonomy", label: "Autonomy" },
  { id: "talon", label: "Talon-1" },
  { id: "philosophy", label: "Philosophy" },
] as const;

export type Status = "implemented" | "development" | "research" | "roadmap";

export const STATUS_LABEL: Record<Status, string> = {
  implemented: "Implemented",
  development: "In development",
  research: "Research",
  roadmap: "Roadmap",
};
