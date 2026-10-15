import { useEffect, useState } from "react";
import { RELEASE } from "../site";

const UNITS = [
  ["Days", 86400],
  ["Hours", 3600],
  ["Min", 60],
  ["Sec", 1],
] as const;

function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function Countdown() {
  const left = Math.max(0, Math.floor((RELEASE.getTime() - useNow()) / 1000));
  if (left === 0) {
    return (
      <div className="countdown">
        <p className="eyebrow">Talon-1</p>
        <p className="countdown-live">Out now.</p>
      </div>
    );
  }
  return (
    <div className="countdown">
      <p className="eyebrow">Talon-1 / Dec 25</p>
      <ol role="timer" aria-label="Time until Talon-1">
        {UNITS.map(([label, size], i) => {
          const value = i === 0 ? Math.floor(left / size) : Math.floor((left % UNITS[i - 1][1]) / size);
          return (
            <li key={label}>
              <b>{String(value).padStart(2, "0")}</b>
              <span>{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
