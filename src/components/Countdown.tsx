import { useEffect, useState } from "react";
import { RELEASE } from "../site";

const UNITS = [
  ["Days", "D", 86400],
  ["Hours", "H", 3600],
  ["Minutes", "M", 60],
  ["Seconds", "S", 1],
] as const;

function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** A compact launch indicator: label, then D / H / M / S in monospace. */
export function Countdown({ className = "" }: { className?: string }) {
  const left = Math.max(0, Math.floor((RELEASE.getTime() - useNow()) / 1000));
  return (
    <div className={`countdown ${className}`}>
      <p className="countdown-label">
        <i aria-hidden="true" />
        Talon-1 / <time dateTime="2026-12-25">December 25, 2026</time>
      </p>
      {left === 0 ? (
        <p className="countdown-live">Available now.</p>
      ) : (
        <ol role="timer" aria-label="Time until Talon-1">
          {UNITS.map(([label, short, size], i) => {
            const value = i === 0 ? Math.floor(left / size) : Math.floor((left % UNITS[i - 1][2]) / size);
            return (
              <li key={label}>
                <b>{String(value).padStart(2, "0")}</b>
                <span aria-hidden="true">{short}</span>
                <span className="sr-only">{label}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
