import { context } from "@daydreamsai/core";
import * as z from "zod";
import type { StrategyMemory } from "../types.js";

export const strategyContext = context({
  type: "strategy",
  schema: z.object({ levelBucket: z.number() }),
  key: ({ levelBucket }) => `strategy:${levelBucket}`,
  create: (): StrategyMemory => ({
    profile: "balanced",
    fleeThresholdPct: 30,
    priorityStats: ["charisma", "dexterity", "vitality"],
    weaponTriangle: {
      magical: "brute",
      brute: "hunter",
      hunter: "magical",
    },
  }),
  render: ({ memory: m }) => {
    return [
      `Strategy profile: ${m.profile}`,
      `Flee when HP < ${m.fleeThresholdPct}%`,
      `Stat priority: ${m.priorityStats.join(" > ")}`,
      `Weapon triangle: Magical -> Brute -> Hunter -> Magical`,
    ].join("\n");
  },
});
