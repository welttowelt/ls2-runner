import "dotenv/config";
import "dotenv/config";
import { createAgent } from "./agent.js";
import { runGameLoop } from "./loop/tick.js";
import { logger } from "./utils/logger.js";
import { CartridgeControllerCli } from "./starknet/controllerCli.js";
import { GameStateReader } from "./browser/reader.js";

function envBool(name: string, def: boolean) {
  const v = process.env[name];
  if (!v) return def;
  return v === "1" || v.toLowerCase() === "true";
}

function envInt(name: string, def: number) {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

async function main() {
  const tickIntervalMs = envInt("TICK_INTERVAL_MS", 10_000);
  const maxTicks = envInt("MAX_TICKS", 500);
  const maxConsecutiveErrors = envInt("MAX_CONSECUTIVE_ERRORS", 5);
  const maxTxPerMinute = envInt("MAX_TX_PER_MINUTE", 6);
  const maxTxPerSession = envInt("MAX_TX_PER_SESSION", 200);

  const runId = process.argv[2] ?? `run-${Date.now()}`;

  const contractAddress = process.env.LS2_CONTRACT_ADDRESS;
  if (!contractAddress) throw new Error("Missing LS2_CONTRACT_ADDRESS in env");

  const ctrl = new CartridgeControllerCli({
    contractAddress,
    maxTxPerMinute,
    maxTxPerSession,
  });

  await ctrl.ensureActiveSession();
  logger.info("controller session active");

  const useBrowser = envBool("USE_BROWSER", true);
  const headless = envBool("HEADLESS", true);
  const reader = useBrowser ? new GameStateReader("./screenshots") : null;
  if (reader) await reader.launch(headless);

  const agent = createAgent({ ctrl, reader });
  await agent.start();

  logger.info({ runId }, "ls2-runner started");

  await runGameLoop({
    agent,
    browser: reader as any,
    runId,
    cfg: { tickIntervalMs, maxTicks, maxConsecutiveErrors },
  });
}

main().catch((err) => {
  logger.error({ err }, "fatal");
  process.exit(1);
});
