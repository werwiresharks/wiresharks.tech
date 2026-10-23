import { test } from "node:test";
import assert from "node:assert/strict";
import { RaptorEngine } from "./engine.ts";
import { describeEvent } from "./describe.ts";

test("a retired agent's actual label remains available to historical event descriptions", () => {
  const engine = new RaptorEngine();
  engine.ingest({ type: "agent.spawned", agentId: "root", parentId: null, label: "Raptor", seq: 1 });
  engine.ingest({ type: "agent.spawned", agentId: "child", parentId: "root", label: "Search the API", seq: 2 });
  const labels = new Map(Object.values(engine.model.agents).map(a => [a.id, a.label]));
  const event = { type: "transfer", fromAgentId: "child", toAgentId: "root", transferId: "r", kind: "result", disposition: "delivered", seq: 3 } as const;
  engine.ingest(event);
  engine.ingest({ type: "agent.reintegrated", agentId: "child", seq: 4 });
  assert.equal(engine.model.agents.child, undefined);
  assert.equal(describeEvent(event, engine.model, id => labels.get(id)), "A result moved from Search the API to Raptor");
  assert.equal(describeEvent(event, engine.model), "A result moved from child to Raptor");
});
