import { SessionLog } from "./log.ts";
import { playScenario } from "./scenario.ts";
import { createSessionServer } from "./sessionServer.ts";

/**
 * Entry point: a session log fed by the demonstration scenario, served over
 * SSE. Configure with PORT and CORS_ORIGIN. Stop with SIGINT/SIGTERM.
 */
const port = Number(process.env.PORT ?? 8787);
const origin = process.env.CORS_ORIGIN ?? "*";

const log = new SessionLog();
const stopScenario = playScenario(log);
const server = createSessionServer({ log, origin });

server.listen(port, () => {
  console.log(`Raptor session stream on http://localhost:${port}`);
  console.log(`  events  http://localhost:${port}/events`);
  console.log(`  health  http://localhost:${port}/health`);
});

const shutdown = () => {
  stopScenario();
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
