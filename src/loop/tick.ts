import type { GameStateReader } from "../browser/reader.js";
import type { EpisodeMemory, GameRunMemory } from "../types.js";
import { logger } from "../utils/logger.js";
import { exportEpisode, makeEpisodeEntry } from "./export.js";
import { ls2Context } from "../daydreams/ls2Context.js";

export type LoopConfig = {
  tickIntervalMs: number;
  maxTicks: number;
  maxConsecutiveErrors: number;
};

export async function runGameLoop(params: {
  agent: any;
  browser: GameStateReader | null;
  runId: string;
  cfg: LoopConfig;
}) {
  const { agent, browser, runId, cfg } = params;

  const episode: EpisodeMemory = { entries: [] };

  let ticks = 0;
  let consecutiveErrors = 0;

  const stopAndExport = async (reason: string) => {
    logger.warn({ reason }, "stopping loop");
    await exportEpisode(runId, episode);
  };

  const interval = setInterval(async () => {
    if (ticks >= cfg.maxTicks) {
      clearInterval(interval);
      await stopAndExport("max_ticks");
      return;
    }
    if (consecutiveErrors >= cfg.maxConsecutiveErrors) {
      clearInterval(interval);
      await stopAndExport("max_consecutive_errors");
      return;
    }

    ticks++;

    try {
      const res = await agent.send(
        ls2Context as any,
        { runId } as any,
        {
          type: "tick",
          data: `Tick ${ticks}. Follow rules: observeState first, then at most one action.`,
        }
      );

      consecutiveErrors = 0;

      // Pull run state from the agent memory store
      const mem = (await agent.memory.get(`ls2:run:${runId}`)) as GameRunMemory | null;

      // Best-effort: screenshot only on phase change (if browser sensor is enabled)
      if (mem && mem.phase !== mem.lastPhase && browser) {
        const shot = await browser.screenshot(runId, mem.tickCount, `phase-${mem.phase}`);
        episode.entries.push(
          makeEpisodeEntry({
            tick: mem.tickCount,
            phase: mem.phase,
            action: "phase-change",
            reasoning: "",
            result: `phase ${mem.lastPhase ?? "?"} -> ${mem.phase}`,
            screenshotPath: shot,
            stateSnapshot: {
              hp: mem.hp,
              maxHp: mem.maxHp,
              gold: mem.gold,
              xp: mem.xp,
              level: mem.level,
              phase: mem.phase,
            },
          })
        );
      }

      // Stop if dead
      if (mem?.phase === "dead") {
        clearInterval(interval);
        await stopAndExport("dead");
      }

      logger.info({ tick: ticks, phase: mem?.phase }, "tick ok");
      return res;
    } catch (err) {
      consecutiveErrors++;
      logger.warn({ err, consecutiveErrors }, "tick failed");
    }
  }, cfg.tickIntervalMs);

  return interval;
}
