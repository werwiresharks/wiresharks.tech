import { useEffect, useRef } from "react";
import { projectOrb, spherePoints } from "./orb";
import type { OrbState } from "./orb";
import { play, stop } from "./ticker";

const MORPH_MS = 700;

/**
 * A small particle globe, drawn on a 2D canvas in the ink colour with the
 * brand red. It animates only while on screen and holds still under reduced
 * motion. With `yieldToJourney`, it fades out on the home page while the
 * page-long particle stream docks its own particles in the same place.
 */
export function MiniOrb({ state, size, yieldToJourney = false }: { state: OrbState; size: number; yieldToJourney?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const target = useRef({ from: state, to: state, since: 0 });
  const redraw = useRef<(() => void) | null>(null);

  useEffect(() => {
    const t = target.current;
    if (t.to === state) return;
    t.from = t.to;
    t.to = state;
    t.since = performance.now();
    redraw.current?.();
  }, [state]);

  useEffect(() => {
    const node = canvas.current;
    const ctx = node?.getContext("2d");
    if (!node || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    node.width = Math.round(size * dpr);
    node.height = Math.round(size * dpr);
    const points = spherePoints(size < 30 ? 90 : size < 48 ? 150 : 240);
    const style = getComputedStyle(node);
    const ink = style.color;
    const red = style.getPropertyValue("--red").trim() || "#e5251b";
    const dot = Math.max(0.7, size / 34) * dpr;
    const radius = (size / 2 - dot * 1.5 / dpr - 1) * dpr;
    const centre = (size * dpr) / 2;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;

    const draw = (now: number) => {
      const t = target.current;
      const k = motion.matches ? 1 : (now - t.since) / MORPH_MS;
      const seconds = motion.matches ? 1.4 : now / 1000;
      ctx.clearRect(0, 0, node.width, node.height);
      for (const p of projectOrb(points, t.from, t.to, k, seconds)) {
        const front = (p.depth + 1) / 2;
        ctx.globalAlpha = 0.18 + front * 0.72;
        ctx.fillStyle = p.red ? red : ink;
        const s = dot * (0.7 + front * 0.5);
        ctx.fillRect(centre + p.x * radius - s / 2, centre - p.y * radius - s / 2, s, s);
      }
    };
    const sync = () => {
      if (visible && !motion.matches) play(draw);
      else stop(draw);
      draw(performance.now());
    };
    redraw.current = sync;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    io.observe(node);
    motion.addEventListener("change", sync);
    sync();
    return () => {
      stop(draw);
      io.disconnect();
      motion.removeEventListener("change", sync);
      redraw.current = null;
    };
  }, [size]);

  return <canvas ref={canvas} className="mini-orb" data-yield={yieldToJourney || undefined} style={{ width: size, height: size }} aria-hidden="true" />;
}
