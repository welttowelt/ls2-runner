import { createDreams } from "@daydreamsai/core";
import { anthropic } from "@ai-sdk/anthropic";
import type { CartridgeControllerCli } from "./starknet/controllerCli.js";
import type { GameStateReader } from "./browser/reader.js";
import { makeGameActions } from "./actions/gameActions.js";
import { ls2Context } from "./daydreams/ls2Context.js";

export function createAgent(params: { ctrl: CartridgeControllerCli; reader: GameStateReader | null }) {
  const actions = makeGameActions(params);

  const agent = createDreams({
    // Daydreams core currently expects LanguageModelV1; provider typings may drift.
    model: anthropic("claude-sonnet-4-20250514") as any,
    context: ls2Context as any,
    actions: [
      actions.observeState,
      actions.attackBeast,
      actions.fleeBeast,
      actions.explore,
      actions.takeScreenshot,
    ] as any,
  });

  // Provide dependencies via container
  agent.container.instance("controller", params.ctrl);
  agent.container.instance("reader", params.reader);

  return agent;
}
