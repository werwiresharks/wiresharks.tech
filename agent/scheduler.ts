/**
 * A small, reusable execution harness: run a set of jobs with bounded
 * concurrency, a per-job timeout, cooperative cancellation, and an activity log.
 *
 * It is deliberately generic — it knows nothing about reviews or workers. The
 * orchestrator builds one job per delegated task and lets the scheduler run them
 * in parallel without exceeding a worker budget or hanging on a stuck job. Each
 * job is handed an `AbortSignal`; a well-behaved job stops when it fires. If a
 * job ignores the signal the scheduler still settles its outcome (so the whole
 * run cannot hang), it simply cannot force the job's own work to stop.
 */
export type JobStatus = "completed" | "failed" | "timed-out" | "cancelled";

export interface ScheduledJob<T> {
  id: string;
  run(signal: AbortSignal): Promise<T>;
}

export interface JobOutcome<T> {
  id: string;
  status: JobStatus;
  /** Present when status is "completed". */
  value: T | null;
  /** Present when status is not "completed". */
  error: string | null;
  durationMs: number;
}

export interface ActivityEntry {
  jobId: string;
  event: "started" | JobStatus;
  at: number;
}

export interface ScheduleOptions {
  /** Max jobs running at once. Default 4. */
  concurrency?: number;
  /** Per-job time budget in ms. Omit or 0 for no timeout. */
  timeoutMs?: number;
  /** Cancels every job still pending or running. */
  signal?: AbortSignal;
  /** Receives one entry per job state change, for audit. */
  onActivity?: (entry: ActivityEntry) => void;
}

const REASON_TIMEOUT = "timeout";
const REASON_CANCELLED = "cancelled";

/** Run `jobs` under the given limits; resolves once every job has an outcome. */
export async function runScheduled<T>(
  jobs: readonly ScheduledJob<T>[],
  options: ScheduleOptions = {},
): Promise<JobOutcome<T>[]> {
  const concurrency = Math.max(1, options.concurrency ?? 4);
  const timeoutMs = options.timeoutMs ?? 0;
  const parent = options.signal;
  const log = options.onActivity ?? (() => {});

  const outcomes: JobOutcome<T>[] = new Array(jobs.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      const index = next++;
      if (index >= jobs.length) return;
      const job = jobs[index];

      // Already cancelled before we could start: record and move on.
      if (parent?.aborted) {
        log({ jobId: job.id, event: "cancelled", at: Date.now() });
        outcomes[index] = { id: job.id, status: "cancelled", value: null, error: "assessment cancelled", durationMs: 0 };
        continue;
      }

      log({ jobId: job.id, event: "started", at: Date.now() });
      outcomes[index] = await runOne(job, parent, timeoutMs);
      log({ jobId: job.id, event: outcomes[index].status, at: Date.now() });
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, jobs.length || 1) }, worker),
  );
  return outcomes;
}

async function runOne<T>(
  job: ScheduledJob<T>,
  parent: AbortSignal | undefined,
  timeoutMs: number,
): Promise<JobOutcome<T>> {
  const started = Date.now();
  const ac = new AbortController();
  let reason: string | null = null;

  const onParentAbort = () => {
    reason = REASON_CANCELLED;
    ac.abort();
  };
  if (parent) parent.addEventListener("abort", onParentAbort, { once: true });

  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout: Promise<never> | null =
    timeoutMs > 0
      ? new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reason = REASON_TIMEOUT;
            ac.abort();
            reject(new Error("timed out"));
          }, timeoutMs);
        })
      : null;

  // A promise that rejects as soon as the signal aborts, so a job that honors
  // the signal settles promptly even if its own work lingers.
  const aborted = new Promise<never>((_, reject) => {
    if (ac.signal.aborted) reject(new Error(reason ?? "aborted"));
    else ac.signal.addEventListener("abort", () => reject(new Error(reason ?? "aborted")), { once: true });
  });

  const racers: Promise<T>[] = [job.run(ac.signal), aborted];
  if (timeout) racers.push(timeout);

  try {
    const value = await Promise.race(racers);
    return { id: job.id, status: "completed", value, error: null, durationMs: Date.now() - started };
  } catch (error) {
    const status: JobStatus = reason === REASON_TIMEOUT ? "timed-out" : reason === REASON_CANCELLED ? "cancelled" : "failed";
    return { id: job.id, status, value: null, error: (error as Error).message, durationMs: Date.now() - started };
  } finally {
    if (timer) clearTimeout(timer);
    if (parent) parent.removeEventListener("abort", onParentAbort);
  }
}
