import { useState } from "react";
import { TalosEngine } from "../engine/engine.ts";

/** An engine holding a single idle primary agent. */
export function useIdleEngine() {
  const [engine] = useState(() => {
    const engine = new TalosEngine();
    engine.ingest({ type: "agent.spawned", seq: 1, agentId: "talos", parentId: null, label: "Talos" });
    return engine;
  });
  return engine;
}
