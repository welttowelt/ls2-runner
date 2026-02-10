import * as z from "zod";
import type { Context, WorkingMemory } from "../vendor/daydreams.js";

function emptyWorkingMemory(): WorkingMemory {
  return { inputs: [], outputs: [], thoughts: [], calls: [], results: [] };
}

export const ls2Context: any = {
  type: "ls2",
  schema: z.object({ runId: z.string() }) as any,
  key: ({ runId }: any) => `ls2:${runId}`,
  setup: async ({ runId }: any) => ({ runId }),
  create: () => emptyWorkingMemory(),
  instructions: ({ args }: any) => [
    `You are an autonomous Loot Survivor 2 runner.`,
    `Hard rules:`,
    `- On every tick: call observeState first.`,
    `- Then take at most ONE tx action: explore/attack/flee/upgrade/buyPotion.`,
    `- Never attempt token transfers/approvals; only game actions.`,
    `- If phase is unknown or anything unexpected appears, do nothing.`,
    `RunId: ${args.runId}`,
  ],
};
