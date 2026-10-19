import { useEffect, useState } from "react";
import { RELEASE } from "../site";
import { useInView } from "./useInView";

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

/** Eases from 0 to 1 over ROLL_MS once the readout is seen; 1 when there is no entrance. */
function useRoll(enabled: boolean) {
  const [ref, entrance] = useInView<HTMLDivElement>("0px 0px -20% 0px");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!enabled || entrance !== "play") return;
    let frame = 0;
    const start = performance.now();
    const step = (time: number) => {
      const t = Math.min(1, (time - start) / ROLL_MS);
      setProgress(1 - Math.pow(1 - t, 4));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [enabled, entrance]);

  return [ref, !enabled || entrance === "still" ? 1 : progress] as const;
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
