import { fileURLToPath } from "node:url";
import { SessionLog } from "./log.ts";
import { playScenario } from "./scenario.ts";
import type { ScenarioStep } from "./scenario.ts";
import { recordReview } from "./reviewSession.ts";
import type { RecordReviewOptions } from "./reviewSession.ts";
import { patternReviewer } from "../raptor/src/reviewer.ts";
import { anthropicTransport, modelReviewer, compositeReviewer } from "../raptor/src/modelReviewer.ts";
import { modelPlanner } from "../raptor/src/plan.ts";
import { createSessionServer } from "./sessionServer.ts";
import { createFileWaitlist } from "./store.ts";

/**
 * Entry point: a session log fed by a real Raptor review, served over SSE, plus
 * the site waitlist. The review runs once at startup over REVIEW_TARGET (a small
 * bundled sample repo by default) and the recording loops on screen. By default
 * it is the offline pattern review; set RAPTOR_CONSOLE_MODEL=1 with an
 * ANTHROPIC_API_KEY to record a model-driven review (model reviewer + planner)
 * instead — if that fails it falls back to the offline review, and if no review
 * can run, to the scripted scenario, so the stream is never empty. Configure
 * with PORT, CORS_ORIGIN, WAITLIST_FILE, REVIEW_TARGET and RAPTOR_CONSOLE_MODEL.
 * Stop with SIGINT/SIGTERM.
 */
const port = Number(process.env.PORT ?? 8787);
const origin = process.env.CORS_ORIGIN ?? "*";
const waitlistFile = process.env.WAITLIST_FILE ?? "./.data/waitlist.jsonl";
const reviewTarget =
  process.env.REVIEW_TARGET ??
  fileURLToPath(new URL("./demo/review-target/", import.meta.url));
const useModel =
  !!process.env.ANTHROPIC_API_KEY &&
  /^(1|true|yes|on)$/i.test(process.env.RAPTOR_CONSOLE_MODEL ?? "");

const log = new SessionLog();

async function record(): Promise<ScenarioStep[] | undefined> {
  if (useModel) {
    try {
      const transport = anthropicTransport();
      const options: RecordReviewOptions = {
        root: reviewTarget,
        reviewer: compositeReviewer([patternReviewer(), modelReviewer({ transport })]),
        planner: modelPlanner({ transport }),
      };
      const recorded = await recordReview(options);
      console.log(`Recorded a model-driven review of ${reviewTarget} (${recorded.length} events).`);
      return recorded;
    } catch (error) {
      console.warn(`Model review failed; recording the offline review instead. ${(error as Error).message}`);
    }
  }
  try {
    const recorded = await recordReview({ root: reviewTarget });
    console.log(`Recorded a live review of ${reviewTarget} (${recorded.length} events).`);
    return recorded;
  } catch (error) {
    console.warn(
      `Could not review ${reviewTarget}; streaming the scripted scenario instead. ${(error as Error).message}`,
    );
    return undefined;
  }
}

const steps = await record();

const stopScenario = playScenario(log, steps ? { steps } : {});
const waitlist = createFileWaitlist(waitlistFile);
const server = createSessionServer({ log, origin, waitlist });

server.listen(port, () => {
  console.log(`Raptor session stream on http://localhost:${port}`);
  console.log(`  events    http://localhost:${port}/events`);
  console.log(`  health    http://localhost:${port}/health`);
  console.log(`  waitlist  POST http://localhost:${port}/waitlist`);
});

const shutdown = () => {
  stopScenario();
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
