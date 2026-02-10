import fs from "node:fs/promises";
import path from "node:path";
import type { EpisodeEntry, EpisodeMemory } from "../types.js";
import { logger } from "../utils/logger.js";

export async function exportEpisode(runId: string, episode: EpisodeMemory, outDir = "./episodes") {
  const dir = path.join(outDir, `${runId}-${Date.now()}`);
  await fs.mkdir(dir, { recursive: true });

  await fs.writeFile(path.join(dir, "episode.json"), JSON.stringify(episode.entries, null, 2));

  const entries = episode.entries;
  const summary = {
    runId,
    totalTicks: entries.length,
    finalLevel: entries.at(-1)?.stateSnapshot.level ?? 0,
    actionBreakdown: entries.reduce<Record<string, number>>((acc, e) => {
      acc[e.action] = (acc[e.action] ?? 0) + 1;
      return acc;
    }, {}),
  };
  await fs.writeFile(path.join(dir, "summary.json"), JSON.stringify(summary, null, 2));

  logger.info({ dir }, "episode exported");
  return dir;
}

export function makeEpisodeEntry(args: {
  tick: number;
  phase: EpisodeEntry["phase"];
  action: string;
  reasoning: string;
  result: string;
  screenshotPath?: string;
  stateSnapshot: EpisodeEntry["stateSnapshot"];
}): EpisodeEntry {
  const base: EpisodeEntry = {
    tick: args.tick,
    timestamp: Date.now(),
    phase: args.phase,
    action: args.action,
    reasoning: args.reasoning,
    result: args.result,
    stateSnapshot: args.stateSnapshot,
  };
  if (args.screenshotPath) base.screenshotPath = args.screenshotPath;
  return base;
}
