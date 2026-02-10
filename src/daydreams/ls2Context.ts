import * as z from "zod";
import type { Context, WorkingMemory } from "@daydreamsai/core";

function emptyWorkingMemory(): WorkingMemory {
  return { inputs: [], outputs: [], thoughts: [], calls: [], results: [] };
}

export const ls2Context: Context<WorkingMemory, any, { runId: string }> = {
  type: "ls2",
  schema: z.object({ runId: z.string() }),
  key: ({ runId }) => `ls2:${runId}`,
  setup: async ({ runId }) => ({ runId }),
  create: () => emptyWorkingMemory(),
  instructions: ({ args }) => [
    `You are an autonomous Loot Survivor 2 runner.`,
    `Hard rules:`,
    `- On every tick: call observeState first.`,
    `- Then take at most ONE tx action: explore/attack/flee/upgrade/buyPotion.`,
    `- Never attempt token transfers/approvals; only game actions.`,
    `- If phase is unknown or anything unexpected appears, do nothing.`,
    `RunId: ${args.runId}`,
  ],
};
