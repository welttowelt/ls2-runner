export const SELECTORS = {
  // Primary interaction buttons (text-based)
  attackBtn: "button:has-text('ATTACK'), button:has-text('Attack')",
  fleeBtn: "button:has-text('FLEE'), button:has-text('Flee')",
  exploreBtn: "button:has-text('EXPLORE'), button:has-text('Explore')",

  // Level-up / stat UI is game-specific; we use relative locators in code.

  // Common modal roots (best-effort)
  anyDialog: "[role='dialog'], [class*='modal'], [class*='overlay']",

  // Cartridge / wallet UI patterns (best-effort)
  connectWallet: "button:has-text('Connect'), button:has-text('Connect Wallet')",
} as const;

export const CLICK_BLOCKLIST_REGEX = [
  /buy\s*game/i,
  /purchase/i,
  /top\s*up/i,
  /bridge/i,
  /deposit/i,
  /swap/i,
  /approve/i,
  /unlimited/i,
  /connect\s*wallet/i,
];
