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

/** The transfers a move from one beat to the next starts. */
export function transfers(previous: AgentState[], next: AgentState[]): Transfer[] {
  return next.flatMap((state, agent): Transfer[] => {
    const before = previous[agent];
    if (before === "queued" && ACTIVE.includes(state)) return [{ agent, direction: "down" }];
    if (before !== "returning" && state === "returning") return [{ agent, direction: "up" }];
    return [];
  });
}

/**
 * The agent's clock at the end of beat `index`, formatted as the app does: "34s", then "1:05".
 * Seven script seconds pass per real second. It runs while the agent works and stops when it is done.
 */
export function elapsed(beats: Beat[], index: number, agent: number): string {
  let ms = 0;
  for (let i = 0; i <= index; i++) {
    const state = beats[i].agents[agent];
    if (state !== "queued" && state !== "done") ms += beats[i].hold;
  }
  const seconds = Math.round((ms * 7) / 1000);
  if (!ms) return "";
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Build a script from compact rows: "q" queued, "w" working, "s" searching, "x" solving, "r" returning, "d" done. */
export function script(rows: [hold: number, raptor: OrbState, agents: string][]): Beat[] {
  const codes: Record<string, AgentState> = { q: "queued", w: "working", s: "searching", x: "solving", r: "returning", d: "done" };
  return rows.map(([hold, raptor, agents]) => ({ hold, raptor, agents: [...agents].map((code) => codes[code]) }));
}
