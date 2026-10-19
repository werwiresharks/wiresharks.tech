import { useState } from "react";
import { RaptorEngine } from "../engine/engine.ts";

/** An engine holding a single idle primary agent. */
export function useIdleEngine() {
  const [engine] = useState(() => {
    const engine = new RaptorEngine();
    engine.ingest({ type: "agent.spawned", seq: 1, agentId: "raptor", parentId: null, label: "Raptor" });
    return engine;
  });
  return engine;
}
