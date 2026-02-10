import type { GameRunMemory, Phase, Stats } from "../types.js";
import { logger } from "../utils/logger.js";

// v0.1: hybrid parser
// - Prefer GraphQL intercept when available (Torii/Dojo entities)
// - Fall back to minimal DOM-derived signals for phase detection

export type AdventurerEntityState = {
  hp?: number;
  maxHp?: number;
  gold?: number;
  xp?: number;
  level?: number;
  stats?: Partial<Stats>;
};

export class GameStateParser {
  private entityState: AdventurerEntityState | null = null;

  updateFromGraphQL(payload: any) {
    try {
      // Payload shapes vary. We store the raw object for now.
      // In v0.2: implement a real Torii entity extractor keyed by model.
      const entities = payload?.data?.entities;
      if (!entities) return;

      // Best-effort: try a few common keys
      const maybe = Array.isArray(entities) ? entities : entities?.edges?.map((e: any) => e?.node);
      if (!Array.isArray(maybe)) return;

      // Heuristic: find object with health/xp/gold/level fields
      const adv = maybe.find((e: any) => e && ("health" in e || "hp" in e) && ("xp" in e || "gold" in e));
      if (!adv) return;

      this.entityState = {
        hp: Number(adv.health ?? adv.hp),
        maxHp: Number(adv.max_health ?? adv.maxHp ?? adv.max_health_points ?? adv.max_health),
        gold: Number(adv.gold),
        xp: Number(adv.xp),
        level: Number(adv.level),
        stats: {
          strength: Number(adv.strength ?? adv.str),
          vitality: Number(adv.vitality ?? adv.vit),
          dexterity: Number(adv.dexterity ?? adv.dex),
          wisdom: Number(adv.wisdom ?? adv.wis),
          intelligence: Number(adv.intelligence ?? adv.int),
          charisma: Number(adv.charisma ?? adv.cha),
          luck: Number(adv.luck ?? adv.luc),
        },
      };
    } catch (err) {
      logger.debug({ err }, "failed to parse graphql payload");
    }
  }

  getEntityState(): AdventurerEntityState | null {
    return this.entityState;
  }

  // Phase detection uses DOM text and button visibility signals.
  // Kept conservative.
  detectPhaseFromDomSignals(signals: {
    bodyText: string;
    hasAttack: boolean;
    hasFlee: boolean;
    hasExplore: boolean;
  }): Phase {
    const t = signals.bodyText.toLowerCase();
    if (t.includes("you died") || t.includes("defeated") && t.includes("death")) return "dead";
    if (t.includes("level up") || t.includes("select stats")) return "level_up";
    if (t.includes("market") || t.includes("potions") || t.includes("gold left")) return "market";
    if (signals.hasAttack && (t.includes("ambushed") || t.includes("power"))) return "beast_encounter";
    if (signals.hasExplore) return "idle";
    return "unknown";
  }

  mergeIntoMemory(mem: GameRunMemory): void {
    if (!this.entityState) return;

    const s = this.entityState;
    if (typeof s.hp === "number" && !Number.isNaN(s.hp)) mem.hp = s.hp;
    if (typeof s.maxHp === "number" && !Number.isNaN(s.maxHp)) mem.maxHp = s.maxHp;
    if (typeof s.gold === "number" && !Number.isNaN(s.gold)) mem.gold = s.gold;
    if (typeof s.xp === "number" && !Number.isNaN(s.xp)) mem.xp = s.xp;
    if (typeof s.level === "number" && !Number.isNaN(s.level)) mem.level = s.level;

    if (s.stats) {
      for (const [k, v] of Object.entries(s.stats)) {
        if (typeof v === "number" && !Number.isNaN(v)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (mem.stats as any)[k] = v;
        }
      }
    }
  }
}
