import type { IngestRecord } from "./engine.ts";

/**
 * The screen-reader narration of a session: a capped log of accepted events.
 *
 * Rejected events never changed the model, so they are never announced. The
 * log keeps only the most recent lines, so a long session does not grow an
 * unbounded live region.
 */
export function appendNarration(
  lines: string[],
  record: IngestRecord,
  max = 12,
): string[] {
  if (!record.accepted) return lines;
  const next = [...lines, record.description];
  return next.length > max ? next.slice(next.length - max) : next;
}
