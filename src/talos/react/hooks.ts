import { useEffect, useState, useSyncExternalStore } from "react";
import { TalosEngine } from "../engine/engine.ts";
import type { IngestRecord } from "../engine/engine.ts";
import type { TalosModel } from "../engine/model.ts";

/** An engine holding a single idle primary agent. */
export function useIdleEngine() {
  const [engine] = useState(() => {
    const engine = new TalosEngine();
    engine.ingest({ type: "agent.spawned", seq: 1, agentId: "talos", parentId: null, label: "Talos" });
    return engine;
  });
  return engine;
}

export function useEngineModel(engine: TalosEngine): TalosModel {
  return useSyncExternalStore(
    (notify) => engine.subscribe(() => notify()),
    () => engine.model,
  );
}

/** The most recent accepted events, newest first. */
export function useEventLog(engine: TalosEngine, size = 6) {
  const [log, setLog] = useState<IngestRecord[]>([]);
  useEffect(
    () =>
      engine.subscribe((_, record) => {
        if (!record?.accepted) return;
        if (record.event.type === "session.reset") setLog([record]);
        else setLog((current) => [record, ...current].slice(0, size));
      }),
    [engine, size],
  );
  return log;
}
