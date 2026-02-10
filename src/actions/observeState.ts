import { action } from "../vendor/daydreams.js";
import * as z from "zod";
import type { GameStateReader } from "../browser/reader.js";
import { getRunState, setRunState } from "../state/store.js";

export const observeState = (reader: GameStateReader | null) =>
  action({
    name: "observeState",
    description: "Observe current game state (read-only). Must be called first on every tick.",
    schema: z.object({}),
    handler: async (_args: any, ctx: any) => {
      const runId = ctx.contextId ?? ctx.context?.key ?? "default";
      const mem = await getRunState(ctx.agent.memory, runId);

      mem.tickCount++;
      mem.lastPhase = mem.phase;

      if (!reader) {
        mem.phase = "unknown";
        await setRunState(ctx.agent.memory, runId, mem);
        return { success: true, phase: mem.phase, note: "no-browser-sensor" };
      }

      reader.getParser().mergeIntoMemory(mem);
      mem.phase = await reader.detectPhase();

      await setRunState(ctx.agent.memory, runId, mem);

      return { success: true, phase: mem.phase, hp: mem.hp, maxHp: mem.maxHp, level: mem.level };
    },
  });
