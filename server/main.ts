import { SessionLog } from "./log.ts";
import { playScenario } from "./scenario.ts";
import { createSessionServer } from "./sessionServer.ts";
import { createFileWaitlist } from "./store.ts";

/**
 * Entry point: a session log fed by the demonstration scenario, served over
 * SSE, plus the site waitlist. Configure with PORT, CORS_ORIGIN and
 * WAITLIST_FILE. Stop with SIGINT/SIGTERM.
 */
const port = Number(process.env.PORT ?? 8787);
const origin = process.env.CORS_ORIGIN ?? "*";
const waitlistFile = process.env.WAITLIST_FILE ?? "./.data/waitlist.jsonl";

const log = new SessionLog();
const stopScenario = playScenario(log);
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
