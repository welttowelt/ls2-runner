import { action } from "@daydreamsai/core";
import * as z from "zod";
import type { CartridgeControllerCli } from "../starknet/controllerCli.js";
import type { GameStateReader } from "../browser/reader.js";

// v0.1 pragmatic mode:
// - User clicks in UI
// - Browser intercept blocks account.execute but captures the bundle
// - We re-submit bundle via controller-cli
export const txFromLastCapturedBundle = (params: { ctrl: CartridgeControllerCli; reader: GameStateReader | null }) =>
  action({
    name: "txFromLastCapturedBundle",
    description: "Re-submit the last blocked tx bundle captured in the browser via controller-cli.",
    schema: z.object({}),
    handler: async (_args, ctx: any) => {
      if (!params.reader) return { success: false, error: "no-browser" };

      const bundle = await params.reader.getLastBlockedTxBundle();
      if (!bundle) return { success: false, error: "no-captured-bundle" };

      // Only allow simple calldata (felts/bools/numbers). If we see structs, refuse for now.
      const calls = bundle.calls.map((c) => {
        const hasObject = (c.calldata || []).some((x) => typeof x === "object" && x !== null);
        if (hasObject) throw new Error(`struct-calldata-not-supported for ${c.entrypoint}`);
        return {
          contractAddress: c.contractAddress,
          entrypoint: c.entrypoint,
          calldata: (c.calldata || []) as Array<string | number | boolean>,
        };
      });

      const res = await params.ctrl.executeBundle(calls);
      return { success: res.status === "success", ...res };
    },
  });
