import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CaretDown, TreeStructure, UsersThree } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { AppTabs, Composer, StatusBar } from "./AppChrome";
import { MiniOrb } from "./MiniOrb";
import { elapsed, transfers } from "./sessionScript";
import type { Beat, Subagent } from "./sessionScript";
import { useBeats } from "./useBeats";
import { play, stop } from "./ticker";

const FLIGHT_MS = 900;

/**
 * The raptor desktop session, as the app lays it out: the session tab, the
 * prompt, the live subagent roster above the composer, and the composer with
 * raptor's globe at its left. Like the app's roster, it lists only workers
 * still queued or running, and it closes when the last one returns. A hidden
 * copy of the full roster holds the panel's height, so the page never
 * reflows. Particles carry each brief down to a worker and each result back
 * up. With `journey`, the home page's particle engine docks into the
 * composer globe and the row globes.
 */
export function Session({
  title,
  prompt,
  reply,
  result,
  agents,
  beats,
  still,
  cwd,
  journey = false,
}: {
  title: string;
  prompt: string;
  reply: string;
  result: string;
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
  const live = agents.map((agent, i) => ({ agent, i, state: beat.agents[i] })).filter(({ state }) => state !== "done");
  const started = beat.agents.some((state) => state !== "queued");

  return (
    <div
      ref={ref}
      className={`panel session${journey ? " home-graph" : ""}`}
      data-ui
      data-roster={journey ? live.map(({ i }) => i).join(" ") : undefined}
      aria-label={`raptor session: ${title}`}
    >
      <AppTabs title={title} tab={busy ? "busy" : "idle"} />
      <div className="app-chat">
        <div className="app-thread">
          <div className="app-thread-ghost" aria-hidden="true">
            <Thread prompt={prompt} reply={reply}>
              <p className="app-tool">
                <UsersThree />
                Delegating
              </p>
              <Roster count={agents.length}>
                {agents.map((agent) => (
                  <li key={agent.name}>
                    <span className="app-agent-orb" />
                    <span className="app-agent-text">
                      <b>{agent.name}</b>
                      <span>{agent.task}</span>
                    </span>
                  </li>
                ))}
              </Roster>
            </Thread>
          </div>
          <Thread prompt={prompt} reply={reply}>
            {started && (
              <p className="app-tool">
                <UsersThree aria-hidden="true" />
                {live.length ? "Delegating" : "Delegated"} {agents.length} tasks
              </p>
            )}
            {!live.length && <p className="app-reply">{result}</p>}
            {live.length > 0 && (
              <Roster count={live.length}>
                {live.map(({ agent, i, state }) => (
                  <li key={agent.name} data-state={state} data-agent={i}>
                    <span className="app-agent-orb" data-home-worker={journey ? i : undefined}>
                      <MiniOrb state={state === "queued" ? "idle" : state} size={30} yieldToJourney={journey} />
                    </span>
                    <span className="app-agent-text">
                      <b>
                        {agent.name}
                        <i>{state}</i>
                      </b>
                      <span>{agent.activity[state] ?? agent.task}</span>
                    </span>
                    <span className="app-timer">{elapsed(beats, index, i)}</span>
                  </li>
                ))}
              </Roster>
            )}
          </Thread>
        </div>
        <Composer raptor={beat.raptor} busy={busy} journey={journey} />
        <canvas className="app-flights" ref={flights} aria-hidden="true" />
      </div>
      <StatusBar cwd={cwd} />
      <p className="sr-only">
        {live.length ? `${live.length} of ${agents.length} workers running.` : `All ${agents.length} workers returned. ${result}`}
      </p>
    </div>
  );
}

function useHolds(beats: Beat[]) {
  const [holds] = useState(() => beats.map((beat) => beat.hold));
  return holds;
}

function Thread({ prompt, reply, children }: { prompt: string; reply: string; children: ReactNode }) {
  return (
    <div className="app-thread-body">
      <p className="app-user">{prompt}</p>
      <p className="app-reply">{reply}</p>
      {children}
    </div>
  );
}

/** The app's composer status section: "N Subagents" over its rows. */
function Roster({ count, children }: { count: number; children: ReactNode }) {
  return (
    <div className="app-stack">
      <div className="app-stack-head">
        <TreeStructure aria-hidden="true" />
        <b>
          {count} Subagent{count === 1 ? "" : "s"}
        </b>
        <CaretDown aria-hidden="true" />
      </div>
      <ol className="app-agents">{children}</ol>
    </div>
  );
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
    // Turning on reduced motion mid-flight drops the particles already in the air.
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const still = () => {
      if (!motion.matches) return;
      flights.current.list = [];
      stop(draw.current);
      ctx.clearRect(0, 0, node.width, node.height);
    };
    motion.addEventListener("change", still);
    return () => {
      resize.disconnect();
      motion.removeEventListener("change", still);
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
      const row = centre(`.app-agents li[data-agent="${move.agent}"] .app-agent-orb`);
      if (!raptor || !row) return;
      const [a, b] = move.direction === "down" ? [raptor, row] : [row, raptor];
      state.list.push({ a, b, start: now + n * 140, seed: move.agent * 7 + n });
    });
    play(draw.current);
  }, [index, beats]);

  return canvas;
}
