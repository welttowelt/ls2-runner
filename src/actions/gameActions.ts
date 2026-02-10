import { action } from "../vendor/daydreams.js";
import * as z from "zod";
import type { CartridgeControllerCli } from "../starknet/controllerCli.js";
import type { GameStateReader } from "../browser/reader.js";
import { observeState } from "./observeState.js";
import { getRunState, setRunState } from "../state/store.js";

export const makeGameActions = (params: { ctrl: CartridgeControllerCli; reader: GameStateReader | null }) => {
  const { ctrl, reader } = params;

  const attackBeast = action({
    name: "attackBeast",
    description: "Attack the current beast (tx via controller-cli).",
    schema: z.object({}),
    handler: async (_args: any, ctx: any) => {
      const runId = ctx.contextId ?? "default";
      const mem = await getRunState(ctx.agent.memory, runId);
      if (mem.phase !== "beast_encounter") return { success: false, error: `invalid-phase:${mem.phase}` };
      const adv = process.env.ADVENTURER_ID;
      if (!adv) return { success: false, error: "missing-ADVENTURER_ID" };
      const res = await ctrl.attack(adv);
      mem.lastAction = "attack";
      mem.lastActionResult = res.status;
      await setRunState(ctx.agent.memory, runId, mem);
      return { success: res.status === "success", ...res };
    },
  });

  const fleeBeast = action({
    name: "fleeBeast",
    description: "Flee from the current beast (tx via controller-cli).",
    schema: z.object({}),
    handler: async (_args: any, ctx: any) => {
      const runId = ctx.contextId ?? "default";
      const mem = await getRunState(ctx.agent.memory, runId);
      if (mem.phase !== "beast_encounter") return { success: false, error: `invalid-phase:${mem.phase}` };
      const adv = process.env.ADVENTURER_ID;
      if (!adv) return { success: false, error: "missing-ADVENTURER_ID" };
      const res = await ctrl.flee(adv);
      mem.lastAction = "flee";
      mem.lastActionResult = res.status;
      await setRunState(ctx.agent.memory, runId, mem);
      return { success: res.status === "success", ...res };
    },
  });

  const explore = action({
    name: "explore",
    description: "Explore once (tx via controller-cli).",
    schema: z.object({}),
    handler: async (_args: any, ctx: any) => {
      const runId = ctx.contextId ?? "default";
      const mem = await getRunState(ctx.agent.memory, runId);
      if (mem.phase !== "idle" && mem.phase !== "exploring") return { success: false, error: `invalid-phase:${mem.phase}` };
      const adv = process.env.ADVENTURER_ID;
      if (!adv) return { success: false, error: "missing-ADVENTURER_ID" };
      const res = await ctrl.explore(adv);
      mem.lastAction = "explore";
      mem.lastActionResult = res.status;
      await setRunState(ctx.agent.memory, runId, mem);
      return { success: res.status === "success", ...res };
    },
  });

  const takeScreenshot = action({
    name: "takeScreenshot",
    description: "Capture a screenshot (browser sensor only).",
    schema: z.object({ label: z.string().default("manual") }),
    handler: async (args: any, ctx: any) => {
      const label = args?.label ?? "manual";
      const runId = ctx.contextId ?? "default";
      const mem = await getRunState(ctx.agent.memory, runId);
      if (!reader) return { success: false, error: "no-browser" };
      const full = await reader.screenshot(mem.runId, mem.tickCount, label);
      return { success: true, path: full };
    },
  });

  return {
    observeState: observeState(reader),
    attackBeast,
    fleeBeast,
    explore,
    takeScreenshot,
  };
};
