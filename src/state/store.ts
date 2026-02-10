import type { MemoryStore } from "@daydreamsai/core";
import type { EpisodeMemory, GameRunMemory } from "../types.js";

export const keys = {
  run: (runId: string) => `ls2:run:${runId}`,
  episode: (runId: string) => `ls2:episode:${runId}`,
};

export async function getRunState(store: MemoryStore, runId: string): Promise<GameRunMemory> {
  const existing = await store.get<GameRunMemory>(keys.run(runId));
  if (existing) return existing;
  const fresh: GameRunMemory = {
    runId,
    hp: 0,
    maxHp: 0,
    gold: 0,
    xp: 0,
    level: 1,
    stats: {
      strength: 0,
      vitality: 0,
      dexterity: 0,
      wisdom: 0,
      intelligence: 0,
      charisma: 0,
      luck: 0,
    },
    equipment: {},
    phase: "unknown",
    currentBeast: null,
    currentObstacle: null,
    availableUpgrades: 0,
    tickCount: 0,
    consecutiveErrors: 0,
    lastAction: "none",
    lastActionResult: "none",
  };
  await store.set(keys.run(runId), fresh);
  return fresh;
}

export async function setRunState(store: MemoryStore, runId: string, state: GameRunMemory): Promise<void> {
  await store.set(keys.run(runId), state);
}

export async function getEpisode(store: MemoryStore, runId: string): Promise<EpisodeMemory> {
  const existing = await store.get<EpisodeMemory>(keys.episode(runId));
  if (existing) return existing;
  const fresh: EpisodeMemory = { entries: [] };
  await store.set(keys.episode(runId), fresh);
  return fresh;
}

export async function setEpisode(store: MemoryStore, runId: string, ep: EpisodeMemory): Promise<void> {
  await store.set(keys.episode(runId), ep);
}
