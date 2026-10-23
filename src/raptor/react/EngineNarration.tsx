import { useEffect, useState } from "react";
import type { RaptorEngine } from "../engine/engine.ts";
import { describeModel } from "../engine/describe.ts";
import { appendNarration } from "../engine/narration.ts";

/**
 * Subscribe to an engine and keep its screen-reader narration: a rolling log
 * of accepted events and a one-line summary of the current state.
 */
export function useEngineNarration(engine: RaptorEngine, max = 12) {
  const [lines, setLines] = useState<string[]>([]);
  const [summary, setSummary] = useState(() => describeModel(engine.model));
  useEffect(() => {
    setSummary(describeModel(engine.model));
    return engine.subscribe((model, record) => {
      setSummary(describeModel(model));
      if (record) setLines((prev) => appendNarration(prev, record, max));
    });
  }, [engine, max]);
  return { lines, summary };
}

/**
 * A visually hidden live region that voices the engine for assistive tech. The
 * canvas is decorative (`aria-hidden`); this is the accessible equivalent.
 * `role="status"` carries the current summary; `role="log"` announces each new
 * event as it happens.
 */
export function EngineNarration({
  engine,
  label = "raptor activity",
}: {
  engine: RaptorEngine;
  label?: string;
}) {
  const { lines, summary } = useEngineNarration(engine);
  return (
    <div className="sr-only">
      <p role="status">{summary}</p>
      <ol role="log" aria-label={label} aria-live="polite" aria-relevant="additions">
        {lines.map((line, i) => (
          <li key={`${i}-${line}`}>{line}</li>
        ))}
      </ol>
    </div>
  );
}
