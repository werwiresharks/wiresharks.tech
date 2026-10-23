import { useEffect, useRef, useState } from "react";
import type { RaptorEngine } from "../engine/engine.ts";
import type { RaptorEventSource } from "../adapters/source.ts";
import type { Framing, RaptorRenderer } from "../engine/renderer.ts";
import { useEngineSource } from "./hooks.ts";

/**
 * Mounts the WebGL renderer for an engine. The renderer and Three.js load
 * lazily so page text paints first; if WebGL is unavailable or the context is
 * lost, a static illustration takes its place and the engine keeps working.
 */
export function RaptorStage({
  engine,
  frame,
  frameKey = "",
  interactive = false,
  paused = false,
  particleScale = 1,
  className = "",
  source,
}: {
  engine: RaptorEngine;
  frame: (width: number, height: number) => Framing;
  /** Change this to re-run `frame`, e.g. when surrounding layout changes. */
  frameKey?: string;
  interactive?: boolean;
  paused?: boolean;
  particleScale?: number;
  className?: string;
  /** A live event source to drive the engine. Omit to drive it elsewhere. */
  source?: RaptorEventSource;
}) {
  useEngineSource(engine, source);
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<RaptorRenderer | null>(null);
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let instance: RaptorRenderer | null = null;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    void import("../engine/renderer.ts")
      .then(({ RaptorRenderer, supportsWebGL }) => {
        if (cancelled || !host.current) return;
        if (!supportsWebGL()) {
          setFailed(true);
          return;
        }
        instance = new RaptorRenderer({
          host: host.current,
          frame: (w, h) => frameRef.current(w, h),
          interactive,
          particleScale,
          reducedMotion: motion.matches,
          onFailure: () => setFailed(true),
        });
        renderer.current = instance;
        engine.attach(instance);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    const onMotion = () => renderer.current?.setReducedMotion(motion.matches);
    motion.addEventListener("change", onMotion);
    return () => {
      cancelled = true;
      motion.removeEventListener("change", onMotion);
      if (instance) engine.detach(instance);
      renderer.current = null;
      setReady(false);
    };
  }, [engine, interactive, particleScale]);

  useEffect(() => {
    renderer.current?.setPaused(paused);
  }, [paused, ready]);

  useEffect(() => {
    renderer.current?.refreshFraming();
  }, [frameKey, ready]);

  return (
    <div
      ref={host}
      className={`rpe-stage${ready ? " is-ready" : ""}${failed ? " is-fallback" : ""} ${className}`}
    >
      {failed && <StaticOrb />}
    </div>
  );
}

/** Non-WebGL stand-in: the same composition, drawn once. */
export function StaticOrb() {
  const dots = [];
  for (let ring = 0; ring < 9; ring++) {
    const r = 18 + ring * 9;
    const count = 10 + ring * 7;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + ring * 0.4;
      dots.push(
        <circle
          key={`${ring}-${i}`}
          cx={150 + Math.cos(a) * r}
          cy={150 + Math.sin(a) * r * 0.98}
          r={1.15}
          opacity={0.25 + (ring / 9) * 0.55}
        />,
      );
    }
  }
  return (
    <svg className="rpe-static" viewBox="0 0 300 300" role="img" aria-label="raptor, drawn as a sphere of particles inside a red boundary">
      <g fill="var(--ink)">{dots}</g>
      <circle cx="150" cy="150" r="120" fill="none" stroke="var(--bronze-deep)" strokeWidth="1" />
    </svg>
  );
}
