import { test } from "node:test";
import assert from "node:assert/strict";
import { ROW_MIN_WIDTH, stageProgress, swarmFrame, swarmLayout } from "./swarm.ts";
import type { Rect, SwarmLayout } from "./swarm.ts";

const desktop = swarmLayout(880, 560);
const phones = [
  [264, 290],
  [300, 420],
  [336, 520],
  [390, 640],
].map(([w, h]) => swarmLayout(w, h));
const layouts = [desktop, swarmLayout(ROW_MIN_WIDTH, 420), ...phones];
const range = (steps = 200) => Array.from({ length: steps + 1 }, (_, i) => i / steps);

test("the figure starts as one Raptor mark, with nothing split, connected or reported", () => {
  for (const layout of layouts) {
    for (const p of [0, -0.5]) {
      const frame = swarmFrame(layout, p);
      assert.deepEqual(frame.mark, { scale: 1, opacity: 1 });
      assert.equal(frame.hub, 0);
      assert.equal(frame.report, 0);
      assert.equal(frame.landed, 0);
      for (const agent of frame.agents) {
        assert.equal(agent.opacity, 0, "agents are hidden inside the mark");
        assert.deepEqual({ x: agent.x, y: agent.y }, layout.origin);
        assert.deepEqual([agent.trail, agent.link, agent.finding, agent.reported, agent.signal.opacity], [0, 0, 0, 0, 0]);
      }
    }
  }
});

test("the end state has every agent settled, connected to its part and reported", () => {
  for (const layout of layouts) {
    const end = swarmFrame(layout, 1);
    assert.deepEqual([end.mark.opacity, end.hub], [0, 1], "the starting mark has split around its hub");
    assert.equal(end.report, 1);
    assert.equal(end.landed, layout.agents.length);
    assert.deepEqual(end.phases, { split: 1, examine: 1, report: 1 });
    end.agents.forEach((agent, i) => {
      assert.deepEqual({ x: agent.x, y: agent.y }, layout.agents[i].at);
      assert.deepEqual([agent.scale, agent.opacity, agent.trail, agent.link, agent.finding, agent.reported], [1, 1, 1, 1, 1, 1]);
      assert.equal(agent.signal.opacity, 0, "the finding has landed");
    });
    assert.deepEqual(swarmFrame(layout, 1.4), end);
  }
});

test("scrolling down only advances the story, and scrolling back retraces it exactly", () => {
  for (const layout of layouts) {
    let previous = swarmFrame(layout, 0);
    for (const p of range()) {
      const frame = swarmFrame(layout, p);
      assert.ok(frame.report >= previous.report && frame.landed >= previous.landed, `report went back at ${p}`);
      assert.ok(frame.mark.opacity <= previous.mark.opacity && frame.hub >= previous.hub, `the mark reappeared at ${p}`);
      frame.agents.forEach((agent, i) => {
        const before = previous.agents[i];
        for (const key of ["trail", "link", "finding", "reported"] as const) {
          assert.ok(agent[key] >= before[key], `agent ${i} ${key} went back at ${p}`);
        }
      });
      previous = frame;
    }
    // Pure in progress: any scroll history lands on the same frame.
    const direct = swarmFrame(layout, 0.7);
    swarmFrame(layout, 0.95);
    swarmFrame(layout, 0.2);
    assert.deepEqual(swarmFrame(layout, 0.7), direct);
  }
});

test("each agent connects only once it has arrived, and reports only once connected", () => {
  for (const layout of layouts) {
    for (const p of range()) {
      for (const agent of swarmFrame(layout, p).agents) {
        if (agent.link > 0) assert.equal(agent.trail, 1, `linked before arriving at ${p}`);
        if (agent.finding > 0) assert.equal(agent.link, 1, `reported before connecting at ${p}`);
      }
    }
  }
});

test("a finding travels from its part into the shared report", () => {
  const agent = desktop.agents[0];
  const start = swarmFrame(desktop, 0).agents[0].signal;
  assert.deepEqual({ x: start.x, y: start.y }, agent.finding[0]);
  const moving = range()
    .map((p) => swarmFrame(desktop, p).agents[0].signal)
    .filter((signal) => signal.opacity > 0);
  assert.ok(moving.length > 0, "the signal is visible on its way");
  for (const signal of moving) {
    assert.ok(signal.x >= agent.node.x + agent.node.w && signal.x <= desktop.report.x, "the signal stays between the part and the report");
  }
  const end = swarmFrame(desktop, 1).agents[0].signal;
  assert.deepEqual({ x: end.x, y: end.y }, agent.finding[3]);
  assert.ok(end.x === desktop.report.x && end.y > agent.row.y && end.y < agent.row.y + agent.row.h, "it lands on its own report row");
});

const inside = (rect: Rect, layout: SwarmLayout) =>
  rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= layout.width && rect.y + rect.h <= layout.height;
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test("phones stack the figure top to bottom with four agents, and it fits the box", () => {
  for (const layout of phones) {
    const box = `${layout.width}×${layout.height}`;
    assert.equal(layout.flow, "column");
    assert.equal(layout.agents.length, 4);
    const half = layout.mark / 2;
    assert.ok(inside({ x: layout.origin.x - half, y: layout.origin.y - half, w: layout.mark, h: layout.mark }, layout), `mark leaves ${box}`);
    assert.ok(inside(layout.system, layout) && inside(layout.report, layout), `frame leaves ${box}`);
    layout.agents.forEach((agent, i) => {
      assert.ok(inside(agent.node, layout) && inside(agent.row, layout), `${agent.part} leaves ${box}`);
      assert.ok(agent.node.w >= 44, `${agent.part} is too narrow for its label in ${box}`);
      assert.ok(agent.at.y + layout.agentMark / 2 < agent.node.y, `${agent.part}'s agent sits on its part in ${box}`);
      assert.ok(agent.node.y + agent.node.h < layout.report.y, `${agent.part} runs into the report in ${box}`);
      for (const other of layout.agents.slice(i + 1)) assert.ok(!overlap(agent.node, other.node), `parts overlap in ${box}`);
    });
    const clearance = Math.min(...layout.agents.map((agent) => Math.abs(agent.link[0].x - layout.labels.system.x)));
    assert.ok(clearance >= 24, `a link runs through the system caption in ${box}`);
  }
});

test("wide boxes run left to right with six agents, every part and row inside the box", () => {
  for (const layout of [desktop, swarmLayout(ROW_MIN_WIDTH, 420), swarmLayout(1200, 640)]) {
    assert.equal(layout.flow, "row");
    assert.equal(layout.agents.length, 6);
    assert.ok(inside(layout.system, layout) && inside(layout.report, layout));
    for (const agent of layout.agents) {
      assert.ok(inside(agent.node, layout) && inside(agent.row, layout));
      assert.ok(agent.at.x < agent.node.x && agent.node.x + agent.node.w < layout.report.x, "agent, part and report read left to right");
    }
  }
});

test("stage progress runs 0 to 1 while the stage is pinned, and only forward as the page scrolls down", () => {
  const pin = { top: 76, height: 824 };
  const track = { height: 824 + 1440 };
  assert.equal(stageProgress({ ...track, top: 400 }, pin, 900), 0);
  assert.equal(stageProgress({ ...track, top: 76 }, pin, 900), 0);
  assert.equal(stageProgress({ ...track, top: 76 - 720 }, pin, 900), 0.5);
  assert.equal(stageProgress({ ...track, top: 76 - 1440 }, pin, 900), 1);
  assert.equal(stageProgress({ ...track, top: -4000 }, pin, 900), 1);
  for (const height of [track.height, pin.height]) {
    let previous = 0;
    for (let top = 1200; top >= -3000; top -= 37) {
      const now = stageProgress({ top, height }, pin, 900);
      assert.ok(now >= previous && now >= 0 && now <= 1, `progress went back at top ${top}`);
      previous = now;
    }
    assert.equal(previous, 1, "an unpinned stage still finishes");
  }
});
