import { context } from "@daydreamsai/core";
import * as z from "zod";
import type { GameRunMemory } from "../types.js";

export const gameRunContext = context({
  type: "game-run",
  schema: z.object({ runId: z.string() }),
  key: ({ runId }) => `run:${runId}`,
  create: (): GameRunMemory => ({
    runId: "",
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
  }),
  render: ({ memory: m }) => {
    return [
      `Run: ${m.runId} (tick ${m.tickCount})`,
      `HP: ${m.hp}/${m.maxHp} | Gold: ${m.gold} | XP: ${m.xp} | Level: ${m.level}`,
      `Stats: STR=${m.stats.strength} VIT=${m.stats.vitality} DEX=${m.stats.dexterity} WIS=${m.stats.wisdom} INT=${m.stats.intelligence} CHA=${m.stats.charisma} LCK=${m.stats.luck}`,
      `Phase: ${m.phase}`,
      m.currentBeast ? `Beast: ${m.currentBeast.name} P=${m.currentBeast.power ?? "?"} HP=${m.currentBeast.hp ?? "?"}` : "",
      m.currentObstacle ? `Obstacle: ${m.currentObstacle.name} slot=${m.currentObstacle.slot ?? "?"} dmg=${m.currentObstacle.damage ?? "?"}` : "",
      `Upgrades available: ${m.availableUpgrades}`,
      `Last action: ${m.lastAction} -> ${m.lastActionResult}`,
    ]
      .filter(Boolean)
      .join("\n");
  },
});
