export type TaskState = "done" | "running" | "queued" | "review";

const LABEL: Record<TaskState, string> = {
  done: "done",
  running: "running",
  queued: "queued",
  review: "in review",
};

/** A coordinator with its workers, as the Talos control plane reports them. */
export function TaskGraph({
  root,
  workers,
}: {
  root: { name: string; model: string };
  workers: { name: string; model: string; engine: string; state: TaskState }[];
}) {
  return (
    <div className="panel graph" data-ui aria-label="Talos task graph">
      <div className="panel-bar">
        <span className="panel-dots" aria-hidden="true" />
        <span>talos / tasks</span>
      </div>
      <div className="graph-root">
        <span className="tag">Coordinator</span>
        <b>{root.name}</b>
        <span className="mono">{root.model}</span>
      </div>
      <ol className="graph-workers">
        {workers.map((w) => (
          <li key={w.name} className={`state-${w.state}`}>
            <i aria-hidden="true" />
            <b>{w.name}</b>
            <span className="mono">
              {w.engine} · {w.model}
            </span>
            <span className="mono graph-state">{LABEL[w.state]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
