import { action } from "../vendor/daydreams.js";
import * as z from "zod";
import type { GameStateReader } from "../browser/reader.js";

const GAME = "0x6f7c4350d6d5ee926b3ac4fa0c9c351055456e75c92227468d84232fc493a9c";
const VRF = "0x051fea4450da9d6aee758bdeba88b2f665bcbf549d2c61421aa724e9ac0ced8f";

export const makeBrowserActuatedCombat = (reader: GameStateReader | null) => {
  const attack = action({
    name: "attackViaBrowser",
    description: "Attack by calling starknet_controller.account.execute (mainnet).",
    schema: z.object({ adventurerId: z.string() }),
    handler: async (args: any, _ctx: any) => {
      const adventurerId = String(args?.adventurerId ?? "");
      if (!reader) return { success: false, error: "no-browser" };
      const act = reader.getActuator();
      // reuse last VRF calldata from any prior tx
      const rr = await act.getLastRequestRandomCalldata();
      if (!rr) return { success: false, error: "no-vrf-seed", hint: "Do one manual action once to seed request_random calldata." };

      const res = await act.executeBundle([
        { contractAddress: VRF, entrypoint: "request_random", calldata: rr },
        { contractAddress: GAME, entrypoint: "attack", calldata: [Number(adventurerId), false] },
      ]);
      return { success: true, res };
    },
  });

  const flee = action({
    name: "fleeViaBrowser",
    description: "Flee by calling starknet_controller.account.execute (mainnet).",
    schema: z.object({ adventurerId: z.string() }),
    handler: async (args: any, _ctx: any) => {
      const adventurerId = String(args?.adventurerId ?? "");
      if (!reader) return { success: false, error: "no-browser" };
      const act = reader.getActuator();
      const rr = await act.getLastRequestRandomCalldata();
      if (!rr) return { success: false, error: "no-vrf-seed" };
      const res = await act.executeBundle([
        { contractAddress: VRF, entrypoint: "request_random", calldata: rr },
        { contractAddress: GAME, entrypoint: "flee", calldata: [Number(adventurerId), false] },
      ]);
      return { success: true, res };
    },
  });

  return { attack, flee };
};
