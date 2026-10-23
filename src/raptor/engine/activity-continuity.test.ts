import { test } from "node:test";
import assert from "node:assert/strict";
import { RaptorEngine } from "./engine.ts";
import type { Activity } from "./events.ts";
import { ParticleField } from "./particles.ts";
import { Substrate } from "./substrate.ts";

const ACTIVITIES: readonly Activity[] = ["listening", "working", "searching", "solving", "composing", "shaping"];
const CAPACITY = 2400;
const CSS_PER_WORLD_UNIT = 600 / 4;
const FRAME_SECONDS = 1 / 60;

function scene(activity: Activity, radius: number) {
  const field = new ParticleField(CAPACITY);
  const engine = new RaptorEngine();
  const substrate = new Substrate(field.lattice, CAPACITY, () => 0);
  let seq = 0;
  engine.ingest({ type: "agent.spawned", agentId: "root", parentId: null, label: "Raptor", seq: ++seq });
  engine.ingest({ type: "agent.state", agentId: "root", state: "running", seq: ++seq });
  engine.ingest({ type: "agent.activity", agentId: "root", activity, seq: ++seq });
  substrate.setAnchors({ primary: { x: 400, y: 300, radius } });
  substrate.sync(engine.model);
  const previous = new Float32Array(field.position.length);
  const previousAlpha = new Float32Array(CAPACITY);
  let initialized = false;
  const setActivity = (next: Activity) => {
    if (engine.model.agents.root.activity === next) return;
    const record = engine.ingest({ type: "agent.activity", agentId: "root", activity: next, seq: ++seq });
    assert.ok(record.accepted, `activity ${next} accepted`);
    substrate.sync(engine.model);
  };
  const measure = (seconds: number, stepLimit: number, label: string) => {
    let maximum = 0;
    let visibleComparisons = 0;
    for (let frame = 0; frame < Math.ceil(seconds / FRAME_SECONDS); frame++) {
      substrate.step(FRAME_SECONDS, false);
      substrate.write(field, 800, 600, 4);
      for (let i = 0; i < CAPACITY; i++) {
        const o = i * 3;
        const alpha = field.params[i * 4];
        if (alpha > 0) {
          if (!Number.isFinite(field.position[o]) || !Number.isFinite(field.position[o + 1]) || !Number.isFinite(field.position[o + 2])) {
            assert.fail(`${label} particle ${i} has a non-finite position`);
          }
          if (initialized && previousAlpha[i] > 0) {
            const displacement = Math.hypot(
              field.position[o] - previous[o],
              field.position[o + 1] - previous[o + 1],
              field.position[o + 2] - previous[o + 2],
            ) * CSS_PER_WORLD_UNIT;
            if (displacement >= radius * stepLimit) {
              assert.fail(`${label} frame ${frame} particle ${i} moved ${displacement.toFixed(3)} CSS pixels, limit ${(radius * stepLimit).toFixed(3)}`);
            }
            maximum = Math.max(maximum, displacement);
            visibleComparisons++;
          }
        }
        previousAlpha[i] = alpha;
      }
      previous.set(field.position);
      initialized = true;
    }
    assert.ok(visibleComparisons > 0, `${label} compares visible positions`);
    return maximum;
  };
  return { setActivity, measure };
}

for (const radius of [160, 24]) {
  test(`settled composing stays continuous through a full shell revolution at radius ${radius}`, (t) => {
    const s = scene("composing", radius);
    s.measure(3, 0.03, "composing warmup");
    // At composing speed the outer shell takes 2π / (0.11 × 0.3) seconds.
    // 192 seconds also covers three complete cycles of both ribbon waves.
    const maximum = s.measure(192, 0.03, "settled composing");
    t.diagnostic(`maximum visible 3D step ${maximum.toFixed(3)} CSS pixels`);
  });

  test(`every activity pair stays continuous throughout a full morph at radius ${radius}`, (t) => {
    let maximum = 0;
    for (const from of ACTIVITIES) {
      for (const to of ACTIVITIES) {
        const s = scene(from, radius);
        s.measure(2 * FRAME_SECONDS, 0.12, `${from} settled`);
        s.setActivity(to);
        maximum = Math.max(maximum, s.measure(3, 0.12, `${from} to ${to}`));
      }
    }
    t.diagnostic(`36 pairs, maximum visible 3D step ${maximum.toFixed(3)} CSS pixels`);
  });

  test(`every activity pair can interrupt an unfinished morph at radius ${radius}`, (t) => {
    let maximum = 0;
    for (const initial of ACTIVITIES) {
      for (const from of ACTIVITIES) {
        if (initial === from) continue;
        for (const to of ACTIVITIES) {
          for (const interruption of [0.25, 0.75]) {
            const s = scene(initial, radius);
            s.measure(2 * FRAME_SECONDS, 0.12, `${initial} settled`);
            s.setActivity(from);
            s.measure(interruption, 0.12, `${initial} toward ${from}`);
            s.setActivity(to);
            maximum = Math.max(maximum, s.measure(1.5, 0.12, `${initial} toward ${from} interrupted by ${to} at ${interruption}s`));
          }
        }
      }
    }
    t.diagnostic(`360 interruption schedules, maximum visible 3D step ${maximum.toFixed(3)} CSS pixels`);
  });
}
