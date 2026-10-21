import { useEffect, useState } from "react";
import { RaptorEngine } from "../engine/engine.ts";
import { connect } from "../adapters/source.ts";
import type { RaptorEventSource } from "../adapters/source.ts";

/** An engine holding a single idle primary agent. */
export function useIdleEngine() {
  const [engine] = useState(() => {
    const engine = new RaptorEngine();
    engine.ingest({ type: "agent.spawned", seq: 1, agentId: "raptor", parentId: null, label: "Raptor" });
    return engine;
  });
  return engine;
}

/**
 * Feed a live event source into an engine for the component's lifetime.
 * Reconnecting the subscription is deferred to the source; this only owns the
 * engine↔source link, disconnecting on unmount or when either changes. Pass
 * `undefined` to drive the engine some other way (e.g. the demo director).
 */
export function useEngineSource(
  engine: RaptorEngine,
  source: RaptorEventSource | undefined,
) {
  useEffect(() => {
    if (!source) return;
    return connect(engine, source);
  }, [engine, source]);
}
