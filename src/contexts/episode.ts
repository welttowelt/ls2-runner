import { context } from "@daydreamsai/core";
import * as z from "zod";
import type { EpisodeMemory } from "../types.js";

export const episodeContext = context({
  type: "episode",
  schema: z.object({ runId: z.string() }),
  key: ({ runId }) => `episode:${runId}`,
  create: (): EpisodeMemory => ({ entries: [] }),
  render: ({ memory: m }) => {
    const recent = m.entries.slice(-5);
    if (recent.length === 0) return "No actions yet.";
    return "Recent history:\n" + recent.map((e) => `[T${e.tick}] ${e.action} -> ${e.result}`).join("\n");
  },
});
