import { useEffect, useRef, useState } from "react";
import { RELEASE } from "../site";

const UNITS = [
  ["Days", "D", 86400],
  ["Hours", "H", 3600],
  ["Minutes", "M", 60],
  ["Seconds", "S", 1],
] as const;

const ROLL_MS = 1400;

function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * 0 until the node first scrolls into view, then eases to 1 over ROLL_MS.
 * Stays at 1 when reduced motion is set or IntersectionObserver is missing.
 */
function useRoll(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(enabled ? 0 : 1);

  useEffect(() => {
    const node = ref.current;
    if (!enabled) return;
    if (!node || typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      return;
    }
    let frame = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const step = (time: number) => {
          const t = Math.min(1, (time - start) / ROLL_MS);
          setProgress(1 - Math.pow(1 - t, 4));
          if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    io.observe(node);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [enabled]);

  return [ref, progress] as const;
}

/**
 * The launch indicator: label, then D / H / M / S in monospace. `mega` sets it
 * as a monumental readout whose digits count up the first time it is seen.
 */
export function Countdown({ className = "", mega = false }: { className?: string; mega?: boolean }) {
  const left = Math.max(0, Math.floor((RELEASE.getTime() - useNow()) / 1000));
  const [ref, progress] = useRoll(mega);
  return (
    <div ref={ref} className={`countdown${mega ? " countdown-mega" : ""} ${className}`}>
      <p className="countdown-label">
        <i aria-hidden="true" />
        Release / <time dateTime="2026-12-25">Dec 25, 2026</time>
      </p>
      {left === 0 ? (
        <p className="countdown-live">Available now.</p>
      ) : (
        <ol role="timer" aria-label="Time until release">
          {UNITS.map(([label, short, size], i) => {
            const value = i === 0 ? Math.floor(left / size) : Math.floor((left % UNITS[i - 1][2]) / size);
            const shown = progress === 1 ? value : Math.round(value * progress);
            return (
              <li key={label}>
                <b>{String(shown).padStart(2, "0")}</b>
                <span aria-hidden="true">{mega ? label : short}</span>
                <span className="sr-only">{label}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
