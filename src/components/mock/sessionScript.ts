import type { OrbState } from "./orb.ts";

/** A subagent's state in the session demo. Queued agents have no work yet. */
export type AgentState = "queued" | Exclude<OrbState, "idle" | "awaiting">;

/** A subagent row: its goal, and the latest step it reports in each state. */
export type Subagent = { name: string; task: string; activity: Partial<Record<AgentState, string>> };

/** One step of a scripted session: how long it holds, each agent's state, and the composer globe. */
export type Beat = { hold: number; agents: AgentState[]; raptor: OrbState };

/** Particles that cross between the composer globe and a row: a brief goes down, a result comes up. */
export type Transfer = { agent: number; direction: "down" | "up" };

const ACTIVE: AgentState[] = ["working", "searching", "solving"];

/** The disclosure line above the list, e.g. "3 working · 2 searching · 1 returned". */
export function summarize(states: AgentState[]): string {
  const counts = new Map<string, number>();
  for (const state of states) {
    const word = state === "done" ? "returned" : state;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return ["working", "searching", "solving", "returning", "returned", "queued"]
    .filter((word) => counts.has(word))
    .map((word) => `${counts.get(word)} ${word}`)
    .join(" · ");
}

/** The transfers a move from one beat to the next starts. */
export function transfers(previous: AgentState[], next: AgentState[]): Transfer[] {
  return next.flatMap((state, agent): Transfer[] => {
    const before = previous[agent];
    if (before === "queued" && ACTIVE.includes(state)) return [{ agent, direction: "down" }];
    if (before !== "returning" && state === "returning") return [{ agent, direction: "up" }];
    return [];
  });
}

/** Build a script from compact rows: "q" queued, "w" working, "s" searching, "x" solving, "r" returning, "d" done. */
export function script(rows: [hold: number, raptor: OrbState, agents: string][]): Beat[] {
  const codes: Record<string, AgentState> = { q: "queued", w: "working", s: "searching", x: "solving", r: "returning", d: "done" };
  return rows.map(([hold, raptor, agents]) => ({ hold, raptor, agents: [...agents].map((code) => codes[code]) }));
}
