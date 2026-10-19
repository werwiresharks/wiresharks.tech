import { test } from "node:test";
import assert from "node:assert/strict";
import { pinProgress, ROW_MIN_WIDTH, STAGES, swarmFrame, swarmLayout, TASK } from "./swarmLayout.ts";
import type { Rect, Stage, SwarmFrame, SwarmLayout } from "./swarmLayout.ts";

/** Canvas sizes the page produces: pinned phones, unpinned phones, tablets and desktops. */
const phones = [
  [264, 384],
  [300, 420],
  [334, 553],
  [420, 480],
  [560, 396],
].map(([w, h]) => swarmLayout(w, h));
const wide = [
  [ROW_MIN_WIDTH, 396],
  [663, 556],
  [720, 516],
  [898, 553],
  [1200, 640],
  [652, 327],
].map(([w, h]) => swarmLayout(w, h));
const desktop = wide[3];
const layouts = [...phones, ...wide];
const range = (steps = 400) => Array.from({ length: steps + 1 }, (_, i) => i / steps);
/** The stage the legend marks as in progress, if any. */
const current = (frame: SwarmFrame) => STAGES.find((stage) => frame.stages[stage].state === "active") ?? null;

test("the figure starts as the task alone, with nothing split, worked on or reported", () => {
  for (const layout of layouts) {
    for (const p of [0, -0.5]) {
      const frame = swarmFrame(layout, p);
      assert.deepEqual([frame.hub, frame.report, frame.landed], [0, 0, 0]);
      for (const agent of frame.agents) {
        assert.equal(agent.opacity, 0, "agents are hidden in the task");
        assert.deepEqual({ x: agent.x, y: agent.y }, layout.origin);
        assert.deepEqual([agent.trail, agent.card, agent.work, agent.finding, agent.reported, agent.signal.opacity], [0, 0, 0, 0, 0, 0]);
      }
    }
  }
});

test("the end state has every agent in its card, its job done and its results in the report", () => {
  for (const layout of layouts) {
    const end = swarmFrame(layout, 1);
    assert.deepEqual([end.hub, end.report, end.landed], [1, 1, layout.agents.length]);
    end.agents.forEach((agent, i) => {
      assert.deepEqual({ x: agent.x, y: agent.y }, layout.agents[i].at);
      assert.deepEqual([agent.scale, agent.opacity, agent.trail, agent.card, agent.work, agent.finding, agent.reported], [1, 1, 1, 1, 1, 1, 1]);
      assert.equal(agent.signal.opacity, 0, "the result has landed");
    });
    for (const stage of STAGES) assert.deepEqual(end.stages[stage], { fill: 1, state: "done" });
    assert.deepEqual(swarmFrame(layout, 1.4), end);
  }
});

test("scroll steps the legend through split, execute and combine, one stage at a time", () => {
  const at = (p: number) => current(swarmFrame(desktop, p));
  assert.deepEqual([0, 0.1, 0.2].map(at), ["split", "split", "split"]);
  assert.deepEqual([0.4, 0.5, 0.6].map(at), ["execute", "execute", "execute"]);
  assert.deepEqual([0.7, 0.8, 0.9].map(at), ["combine", "combine", "combine"]);
  assert.equal(at(1), null, "every stage is done at the end");

  for (const layout of layouts) {
    const seen: (Stage | null)[] = [];
    for (const p of range()) {
      const frame = swarmFrame(layout, p);
      const active = current(frame);
      const index = active ? STAGES.indexOf(active) : STAGES.length;
      STAGES.forEach((stage, i) => {
        const expected = i < index ? "done" : i === index ? "active" : "next";
        assert.equal(frame.stages[stage].state, expected, `${stage} at ${p}`);
      });
      if (seen.at(-1) !== active) seen.push(active);
    }
    assert.deepEqual(seen, [...STAGES, null], "each stage takes its turn once, in order");
  }
});

test("each stage's part of the drawing moves only while that stage is in progress", () => {
  const owners: [Stage, (frame: SwarmFrame) => number[]][] = [
    ["split", (frame) => [frame.hub, ...frame.agents.flatMap((a) => [a.x, a.y, a.opacity, a.scale, a.trail, a.card])]],
    ["execute", (frame) => frame.agents.map((a) => a.work)],
    ["combine", (frame) => [frame.report, ...frame.agents.flatMap((a) => [a.finding, a.reported, a.signal.x, a.signal.opacity])]],
  ];
  for (const layout of layouts) {
    let previous = swarmFrame(layout, 0);
    for (const p of range().slice(1)) {
      const frame = swarmFrame(layout, p);
      for (const [stage, parts] of owners) {
        if (parts(frame).some((v, i) => v !== parts(previous)[i])) {
          assert.equal(previous.stages[stage].state, "active", `${stage} drawing moved outside its stage at ${p}`);
        }
      }
      previous = frame;
    }
  }
});

test("scrolling down only advances the story, and scrolling back retraces it exactly", () => {
  for (const layout of layouts) {
    let previous = swarmFrame(layout, 0);
    for (const p of range()) {
      const frame = swarmFrame(layout, p);
      assert.ok(frame.report >= previous.report && frame.landed >= previous.landed && frame.hub >= previous.hub, `report went back at ${p}`);
      for (const stage of STAGES) assert.ok(frame.stages[stage].fill >= previous.stages[stage].fill, `${stage} went back at ${p}`);
      frame.agents.forEach((agent, i) => {
        const before = previous.agents[i];
        for (const key of ["trail", "card", "work", "finding", "reported"] as const) {
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

test("agents work in parallel, each only after it has arrived, and report only once done", () => {
  for (const layout of layouts) {
    const together = range().some((p) => swarmFrame(layout, p).agents.every((agent) => agent.work > 0 && agent.work < 1));
    assert.ok(together, "at some point every agent is working at once");
    for (const p of range()) {
      for (const agent of swarmFrame(layout, p).agents) {
        if (agent.work > 0) assert.deepEqual([agent.trail, agent.card], [1, 1], `worked before arriving at ${p}`);
        if (agent.finding > 0) assert.equal(agent.work, 1, `reported before finishing at ${p}`);
      }
    }
  }
});

test("a result travels from its agent's card into its own report row", () => {
  const agent = desktop.agents[0];
  const right = agent.card.x + agent.card.w;
  const start = swarmFrame(desktop, 0).agents[0].signal;
  assert.deepEqual({ x: start.x, y: start.y }, { x: right, y: agent.card.y + agent.card.h / 2 });
  const moving = range()
    .map((p) => swarmFrame(desktop, p).agents[0].signal)
    .filter((signal) => signal.opacity > 0);
  assert.ok(moving.length > 0, "the signal is visible on its way");
  for (const signal of moving) {
    assert.ok(signal.x >= right && signal.x <= desktop.report.x, "the signal stays between the card and the report");
  }
  const end = swarmFrame(desktop, 1).agents[0].signal;
  assert.ok(end.x === desktop.report.x && end.y > agent.row.y && end.y < agent.row.y + agent.row.h, "it lands on its own row");
});

test("on phones the jobs branch off one trunk and the results merge into one", () => {
  for (const layout of phones) {
    const starts = new Set(layout.agents.map(({ trail }) => `${trail.from.x},${trail.from.y}`));
    const inlets = new Set(layout.agents.map(({ finding }) => `${finding.to.x},${finding.to.y}`));
    assert.deepEqual([...starts], [`${layout.origin.x},${layout.origin.y}`]);
    assert.equal(inlets.size, 1);
    for (const p of range(100)) {
      for (const agent of swarmFrame(layout, p).agents) {
        assert.ok(agent.x >= layout.task.x && agent.x <= layout.task.x + layout.task.w, `an agent leaves the figure at ${p}`);
        assert.ok(agent.signal.x >= layout.report.x && agent.signal.x <= layout.report.x + layout.report.w, `a result leaves the figure at ${p}`);
      }
    }
    const [inlet] = layout.agents.map(({ finding }) => finding.to);
    assert.ok(inlet.y === layout.report.y && inlet.x > layout.report.x && inlet.x < layout.report.x + layout.report.w, "results enter the report");
  }
});

const inside = (rect: Rect, layout: SwarmLayout) =>
  rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= layout.width && rect.y + rect.h <= layout.height;
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/** Generous advance widths: Geist Mono is 0.6em; 0.6em also covers the 13px Geist titles. */
const mono = (text: string) => text.length * 11 * 0.6;
const title = (text: string) => text.length * 13 * 0.6;

function assertFits(layout: SwarmLayout) {
  const box = `${layout.width}×${layout.height}`;
  assert.ok(inside(layout.task, layout) && inside(layout.report, layout), `a frame leaves ${box}`);
  assert.ok(layout.title.x + title(TASK) <= layout.task.x + layout.task.w - 8, `the task title is clipped in ${box}`);
  layout.agents.forEach((agent, i) => {
    assert.ok(inside(agent.card, layout) && inside(agent.row, layout), `${agent.name} leaves ${box}`);
    assert.ok(agent.label.x + mono(agent.name) <= agent.card.x + agent.card.w - 8, `${agent.name} is clipped in ${box}`);
    assert.ok(agent.row.x + 28 + mono(agent.short) <= agent.bar[0].x - 6, `${agent.short} runs into its bar in ${box}`);
    assert.ok(agent.bar[1].x - agent.bar[0].x >= 40, `${agent.short}'s bar is too short in ${box}`);
    for (const other of layout.agents.slice(i + 1)) assert.ok(!overlap(agent.card, other.card), `cards overlap in ${box}`);
  });
  const cards = layout.agents.map(({ card }) => card);
  assert.equal(new Set(cards.map(({ x, w }) => `${x},${w}`)).size, 1, `cards are not aligned in ${box}`);
  const steps = cards.slice(1).map((card, i) => card.y - cards[i].y);
  assert.ok(steps.every((step) => Math.abs(step - steps[0]) < 1e-9), `cards are not evenly spaced in ${box}`);
}

test("phones stack the figure top to bottom with four agents, all of it inside the box", () => {
  for (const layout of phones) {
    const box = `${layout.width}×${layout.height}`;
    assert.equal(layout.flow, "column");
    assert.equal(layout.agents.length, 4);
    assertFits(layout);
    const first = layout.agents[0].card;
    const last = layout.agents.at(-1)!.card;
    assert.ok(layout.task.y + layout.task.h < first.y && last.y + last.h < layout.report.y, `task, agents and report overlap in ${box}`);
  }
});

test("wide boxes run left to right with six agents, all of it inside the box", () => {
  for (const layout of wide) {
    assert.equal(layout.flow, "row");
    assert.equal(layout.agents.length, 6);
    assertFits(layout);
    for (const agent of layout.agents) {
      assert.ok(layout.task.x + layout.task.w < agent.card.x && agent.card.x + agent.card.w < layout.report.x, "task, agents and report read left to right");
    }
  }
});

test("pin progress runs 0 to 1 while the figure is pinned, and only forward as the page scrolls down", () => {
  const pin = { top: 76, height: 824 };
  const track = { height: 824 + 1440 };
  assert.equal(pinProgress({ ...track, top: 400 }, pin, 900), 0);
  assert.equal(pinProgress({ ...track, top: 76 }, pin, 900), 0);
  assert.equal(pinProgress({ ...track, top: 76 - 720 }, pin, 900), 0.5);
  assert.equal(pinProgress({ ...track, top: 76 - 1440 }, pin, 900), 1);
  assert.equal(pinProgress({ ...track, top: -4000 }, pin, 900), 1);
  for (const height of [track.height, pin.height]) {
    let previous = 0;
    for (let top = 1200; top >= -3000; top -= 37) {
      const now = pinProgress({ top, height }, pin, 900);
      assert.ok(now >= previous && now >= 0 && now <= 1, `progress went back at top ${top}`);
      previous = now;
    }
    assert.equal(previous, 1, "an unpinned figure still finishes");
  }
});
