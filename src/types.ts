export type Phase =
  | "idle"
  | "exploring"
  | "beast_encounter"
  | "obstacle"
  | "level_up"
  | "market"
  | "dead"
  | "session_expired"
  | "unknown";

export type Stats = {
  strength: number;
  vitality: number;
  dexterity: number;
  wisdom: number;
  intelligence: number;
  charisma: number;
  luck: number;
};

export type Beast = {
  name: string;
  power?: number;
  hp?: number;
  type?: string;
};

export type Obstacle = {
  name: string;
  slot?: string;
  damage?: number;
};

export type GameRunMemory = {
  runId: string;

  hp: number;
  maxHp: number;
  gold: number;
  xp: number;
  level: number;
  stats: Stats;
  equipment: Record<string, string>;

  phase: Phase;
  currentBeast: Beast | null;
  currentObstacle: Obstacle | null;
  availableUpgrades: number;

  tickCount: number;
  consecutiveErrors: number;
  lastAction: string;
  lastActionResult: string;

  lastPhase?: Phase;
};

export type StrategyMemory = {
  profile: "aggressive" | "balanced" | "cautious";
  fleeThresholdPct: number;
  priorityStats: Array<keyof Stats>;
  weaponTriangle: Record<string, string>;
};

export type EpisodeEntry = {
  tick: number;
  timestamp: number;
  phase: Phase;
  action: string;
  reasoning: string;
  result: string;
  screenshotPath?: string;
  stateSnapshot: Pick<GameRunMemory, "hp" | "maxHp" | "gold" | "xp" | "level" | "phase">;
};

export type EpisodeMemory = {
  entries: EpisodeEntry[];
};
