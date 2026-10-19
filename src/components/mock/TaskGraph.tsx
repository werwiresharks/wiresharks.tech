import { PanelBar } from "./PanelBar";

export type TaskState = "done" | "running" | "queued" | "review";

const LABEL: Record<TaskState, string> = {
  done: "done",
  running: "running",
  queued: "queued",
  review: "in review",
};

/** A coordinator with its workers, as the Harness control plane reports them. */
export function TaskGraph({
  root,
  workers,
  journey = false,
}: {
  journey?: boolean;
  root: { name: string; model: string };
  workers: { name: string; model: string; engine: string; state: TaskState }[];
}) {
  return (
    <div className={`panel graph${journey ? " home-graph" : ""}`} data-ui aria-label="Raptor task graph">
      <PanelBar title="raptor / tasks" />
      {journey && <div className="home-graph-dock" aria-hidden="true"><i data-home-stop="raptor" /></div>}
      <div className="graph-root">
        <span className="tag">Coordinator</span>
        <b>{root.name}</b>
        <span className="mono">{root.model}</span>
      </div>
      <ol className="graph-workers">
        {workers.map((w, index) => (
          <li key={w.name} className={`state-${w.state}`}>
            <i data-home-worker={journey ? index : undefined} aria-hidden="true" />
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
