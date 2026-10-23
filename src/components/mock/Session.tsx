import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CaretDown, TreeStructure } from "@phosphor-icons/react";
import { AppTabs, Composer, StatusBar } from "./AppChrome";
import { MiniOrb } from "./MiniOrb";
import { summarize, transfers } from "./sessionScript";
import type { Beat, Subagent } from "./sessionScript";
import { useBeats } from "./useBeats";
import { play, stop } from "./ticker";

const FLIGHT_MS = 900;

/**
 * The raptor desktop session, as the app lays it out: the session tab, the
 * prompt, the live subagent roster above the composer, and the composer with
 * raptor's globe at its left. A script steps the agents through their work.
 * Particles carry each brief down to a subagent and each result back up.
 * With `journey`, the home page's particle engine docks into the composer
 * globe and the row globes.
 */
export function Session({
  title,
  prompt,
  reply,
  agents,
  beats,
  still,
  cwd,
  journey = false,
}: {
  title: string;
  prompt: string;
  reply: string;
  agents: Subagent[];
  beats: Beat[];
  still: number;
  cwd: string;
  journey?: boolean;
}) {
  const holds = useHolds(beats);
  const [ref, index] = useBeats<HTMLDivElement>(holds, still);
  const beat = beats[index];
  const busy = beat.agents.some((state) => state !== "done");
  const flights = useFlights(beats, index);
  const live = beat.agents.filter((state) => state !== "done").length;

  return (
    <div ref={ref} className={`panel session${journey ? " home-graph" : ""}`} data-ui aria-label={`raptor session: ${title}`}>
      <AppTabs title={title} tab={busy ? "busy" : "idle"} />
      <div className="app-chat">
        <p className="app-user">{prompt}</p>
        <p className="app-reply">{reply}</p>
        <div className="app-stack">
          <div className="app-stack-head">
            <TreeStructure aria-hidden="true" />
            <b>{agents.length} Subagents</b>
            <span className="app-stack-sum" aria-live="off">{summarize(beat.agents)}</span>
            <CaretDown aria-hidden="true" />
          </div>
          <ol className="app-agents">
            {agents.map((agent, i) => {
              const state = beat.agents[i];
              return (
                <li key={agent.name} data-state={state}>
                  <span className="app-agent-orb" data-home-worker={journey ? i : undefined}>
                    <MiniOrb state={state === "queued" ? "idle" : state} size={22} yieldToJourney={journey} />
                  </span>
                  <span className="app-agent-text">
                    <b>{agent.name}</b>
                    <span>{agent.activity[state] ?? (state === "queued" ? "Queued" : agent.task)}</span>
                  </span>
                  <Timer running={state !== "queued" && state !== "done"} index={index} beats={beats} agent={i} />
                </li>
              );
            })}
          </ol>
        </div>
        <Composer raptor={beat.raptor} busy={busy} journey={journey} />
        <canvas className="app-flights" ref={flights} aria-hidden="true" />
      </div>
      <StatusBar cwd={cwd} />
      <p className="sr-only">
        {live ? `${live} of ${agents.length} subagents running.` : `All ${agents.length} subagents returned.`}
      </p>
    </div>
  );
}

function useHolds(beats: Beat[]) {
  const [holds] = useState(() => beats.map((beat) => beat.hold));
  return holds;
}

/** Elapsed time since the agent started, counted in script time so every loop reads the same. */
function Timer({ running, index, beats, agent }: { running: boolean; index: number; beats: Beat[]; agent: number }) {
  let ms = 0;
  for (let i = 0; i <= index; i++) if (beats[i].agents[agent] !== "queued") ms += beats[i].hold;
  const seconds = Math.round((ms * 7) / 1000);
  const text = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return <span className={`app-timer${running ? "" : " is-quiet"}`}>{ms ? text : ""}</span>;
}

type Flight = { a: DOMPoint; b: DOMPoint; start: number; seed: number };

/**
 * Draws particles that fly between the composer globe and a row globe when
 * a beat starts or returns an agent. Positions are read once per flight, not
 * per frame, and the canvas sizes itself only when the panel resizes.
 */
function useFlights(beats: Beat[], index: number) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const flights = useRef<{ list: Flight[]; previous: number }>({ list: [], previous: index });
  const draw = useRef<(now: number) => void>(() => {});

  useLayoutEffect(() => {
    const node = canvas.current;
    const host = node?.parentElement;
    const ctx = node?.getContext("2d");
    if (!node || !host || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = () => {
      node.width = Math.round(host.clientWidth * dpr);
      node.height = Math.round(host.clientHeight * dpr);
    };
    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(host);
    const red = getComputedStyle(node).getPropertyValue("--red").trim() || "#e5251b";
    const ink = getComputedStyle(node).color;
    draw.current = (now: number) => {
      const state = flights.current;
      ctx.clearRect(0, 0, node.width, node.height);
      state.list = state.list.filter((f) => now - f.start < FLIGHT_MS + 400);
      for (const f of state.list) {
        for (let p = 0; p < 14; p++) {
          const k = (now - f.start - p * 26) / FLIGHT_MS;
          if (k <= 0 || k >= 1) continue;
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          const bend = -Math.min(22, Math.abs(f.b.y - f.a.y) * 0.12) - (f.seed % 3) * 3;
          const x = (1 - e) * (1 - e) * f.a.x + 2 * (1 - e) * e * (Math.min(f.a.x, f.b.x) + bend) + e * e * f.b.x;
          const y = (1 - e) * (1 - e) * f.a.y + 2 * (1 - e) * e * ((f.a.y + f.b.y) / 2) + e * e * f.b.y;
          const jitter = Math.sin(p * 2.3 + f.seed) * 2.5;
          ctx.globalAlpha = Math.sin(k * Math.PI) * 0.85;
          ctx.fillStyle = p % 4 === 0 ? red : ink;
          const s = 1.6 * dpr;
          ctx.fillRect((x + jitter) * dpr - s / 2, (y - jitter) * dpr - s / 2, s, s);
        }
      }
      if (!state.list.length) stop(draw.current);
    };
    return () => {
      resize.disconnect();
      stop(draw.current);
    };
  }, []);

  useEffect(() => {
    const state = flights.current;
    const node = canvas.current;
    const host = node?.parentElement;
    const previous = state.previous;
    state.previous = index;
    if (!node || !host || previous === index || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const moves = transfers(beats[previous].agents, beats[index].agents);
    if (!moves.length) return;
    const origin = host.getBoundingClientRect();
    const centre = (selector: string) => {
      const box = host.querySelector(selector)?.getBoundingClientRect();
      return box ? new DOMPoint(box.left + box.width / 2 - origin.left, box.top + box.height / 2 - origin.top) : null;
    };
    const raptor = centre(".app-composer-orb");
    const now = performance.now();
    moves.forEach((move, n) => {
      const row = centre(`.app-agents li:nth-child(${move.agent + 1}) .app-agent-orb`);
      if (!raptor || !row) return;
      const [a, b] = move.direction === "down" ? [raptor, row] : [row, raptor];
      state.list.push({ a, b, start: now + n * 140, seed: move.agent * 7 + n });
    });
    play(draw.current);
  }, [index, beats]);

  return canvas;
}
