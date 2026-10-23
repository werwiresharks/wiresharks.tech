import { test } from "node:test";
import assert from "node:assert/strict";
import { REVIEW, REVIEW_AGENTS, TRIAGE, TRIAGE_AGENTS } from "./demos.ts";
import { projectOrb, spherePoints } from "./orb.ts";
import type { OrbState } from "./orb.ts";
import { elapsed, script, summarize, transfers } from "./sessionScript.ts";

const DEMOS = [
  { name: "home review", beats: REVIEW, agents: REVIEW_AGENTS },
  { name: "raptor triage", beats: TRIAGE, agents: TRIAGE_AGENTS },
];

test("the roster line counts each state once, finished agents as returned", () => {
  assert.equal(summarize(["working", "done", "queued", "done", "searching"]), "1 working · 1 searching · 2 returned · 1 queued");
});

test("a started agent receives a brief and a returning agent sends its result", () => {
  assert.deepEqual(transfers(["queued", "working", "solving", "done"], ["working", "solving", "returning", "done"]), [
    { agent: 0, direction: "down" },
    { agent: 2, direction: "up" },
  ]);
});

test("an agent's clock is blank while queued, runs while it works, and stops once it returns", () => {
  const beats = script([[1000, "working", "q"], [1000, "working", "w"], [1000, "working", "r"], [5000, "idle", "d"]]);
  assert.deepEqual([0, 1, 2, 3].map((i) => elapsed(beats, i, 0)), ["", "0:07", "0:14", "0:14"]);
});

for (const { name, beats, agents } of DEMOS) {
  test(`${name}: every agent starts queued, returns its result, and ends done`, () => {
    for (const [i, agent] of agents.entries()) {
      const states = beats.map((beat) => beat.agents[i]);
      assert.equal(states[0], "queued", agent.name);
      assert.equal(states.at(-1), "done", agent.name);
      const firstDone = states.indexOf("done");
      assert.equal(states[firstDone - 1], "returning", `${agent.name} reaches done without returning`);
      assert.ok(states.slice(firstDone).every((state) => state === "done"), `${agent.name} leaves done`);
    }
  });

  test(`${name}: each agent reports its own line for every state it shows`, () => {
    for (const [i, agent] of agents.entries()) {
      for (const beat of beats) {
        const state = beat.agents[i];
        assert.equal(beat.agents.length, agents.length);
        if (state !== "queued") assert.ok(agent.activity[state], `${agent.name} has no line for ${state}`);
      }
    }
  });

  test(`${name}: every brief and every result flies exactly once per agent`, () => {
    const moves = beats.slice(1).flatMap((beat, i) => transfers(beats[i].agents, beat.agents));
    for (const direction of ["down", "up"] as const) {
      const agentsMoved = moves.filter((move) => move.direction === direction).map((move) => move.agent).sort();
      assert.deepEqual(agentsMoved, agents.map((_, i) => i), direction);
    }
  });
}

test("every globe point stays inside its canvas through every state and morph", () => {
  const states: OrbState[] = ["idle", "working", "searching", "solving", "returning", "awaiting", "done"];
  const points = spherePoints(150);
  for (const from of states) for (const to of states) for (const k of [0, 0.4, 1]) for (const t of [0, 0.7, 3.1, 11.9]) {
    for (const p of projectOrb(points, from, to, k, t)) assert.ok(Math.hypot(p.x, p.y) <= 1, `${from}→${to} k=${k} t=${t}`);
  }
});
