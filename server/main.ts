import { fileURLToPath } from "node:url";
import { SessionLog } from "./log.ts";
import { playScenario } from "./scenario.ts";
import type { ScenarioStep } from "./scenario.ts";
import { recordReview } from "./reviewSession.ts";
import { createSessionServer } from "./sessionServer.ts";
import { createFileWaitlist } from "./store.ts";

/**
 * Entry point: a session log fed by a real Raptor review, served over SSE, plus
 * the site waitlist. The review runs once at startup over REVIEW_TARGET (a small
 * bundled sample repo by default) and the recording loops on screen. If the
 * review cannot run, the server falls back to the scripted scenario so the
 * stream is never empty. Configure with PORT, CORS_ORIGIN, WAITLIST_FILE and
 * REVIEW_TARGET. Stop with SIGINT/SIGTERM.
 */
const port = Number(process.env.PORT ?? 8787);
const origin = process.env.CORS_ORIGIN ?? "*";
const waitlistFile = process.env.WAITLIST_FILE ?? "./.data/waitlist.jsonl";
const reviewTarget =
  process.env.REVIEW_TARGET ??
  fileURLToPath(new URL("./demo/review-target/", import.meta.url));

const log = new SessionLog();

let steps: ScenarioStep[] | undefined;
try {
  steps = await recordReview({ root: reviewTarget });
  console.log(`Recorded a live review of ${reviewTarget} (${steps.length} events).`);
} catch (error) {
  console.warn(
    `Could not review ${reviewTarget}; streaming the scripted scenario instead. ${(error as Error).message}`,
  );
}

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
