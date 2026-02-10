import { chromium, type Browser, type Page } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "../utils/logger.js";
import { CLICK_BLOCKLIST_REGEX, SELECTORS } from "./selectors.js";
import { TxRateLimiter } from "./txRateLimiter.js";
import { GameStateParser } from "./stateParser.js";
import type { Phase } from "../types.js";

export type BrowserConfig = {
  headless: boolean;
  screenshotsDir: string;
  maxTxPerMinute: number;
  maxTxPerSession: number;
};

export class BrowserController {
  private browser!: Browser;
  private page!: Page;
  private readonly limiter: TxRateLimiter;
  private readonly parser = new GameStateParser();

  constructor(private readonly cfg: BrowserConfig) {
    this.limiter = new TxRateLimiter(cfg.maxTxPerMinute, cfg.maxTxPerSession);
  }

  getPage(): Page {
    return this.page;
  }

  getParser(): GameStateParser {
    return this.parser;
  }

  async launch(): Promise<void> {
    await fs.mkdir(this.cfg.screenshotsDir, { recursive: true });

    this.browser = await chromium.launch({ headless: this.cfg.headless });
    this.page = await this.browser.newPage();

    await this.installNetworkInterceptors();

    await this.page.goto("https://lootsurvivor.io/survivor", { waitUntil: "domcontentloaded" });
    logger.info({ url: this.page.url() }, "opened lootsurvivor");
  }

  async close(): Promise<void> {
    await this.browser?.close();
  }

  async screenshot(runId: string, tick: number, label?: string): Promise<string> {
    const safe = label ? `-${label}` : "";
    const file = `${runId}-tick${tick}${safe}.png`;
    const full = path.join(this.cfg.screenshotsDir, file);
    await this.page.screenshot({ path: full, fullPage: false });
    return full;
  }

  private async installNetworkInterceptors() {
    // Capture Dojo/Torii GraphQL responses; treat them as the primary state source.
    await this.page.route("**/graphql**", async (route) => {
      const res = await route.fetch();
      try {
        const json = await res.json();
        this.parser.updateFromGraphQL(json);
      } catch {
        // ignore
      }
      await route.fulfill({ response: res });
    });

    // Best-effort RPC logging; no method blocking in v0.1.
    await this.page.route("**/rpc**", async (route) => {
      try {
        const body = route.request().postData();
        if (body) {
          logger.debug({ rpc: body.slice(0, 500) }, "rpc request");
        }
      } catch {
        // ignore
      }
      await route.continue();
    });

    this.page.on("dialog", async (d) => {
      logger.warn({ message: d.message() }, "dialog seen; dismissing");
      await d.dismiss().catch(() => undefined);
    });
  }

  async readDomSignals(): Promise<{ phase: Phase; hasAttack: boolean; hasFlee: boolean; hasExplore: boolean; bodyText: string }> {
    const [hasAttack, hasFlee, hasExplore] = await Promise.all([
      this.page.locator(SELECTORS.attackBtn).first().isVisible().catch(() => false),
      this.page.locator(SELECTORS.fleeBtn).first().isVisible().catch(() => false),
      this.page.locator(SELECTORS.exploreBtn).first().isVisible().catch(() => false),
    ]);

    const bodyText = (await this.page.locator("body").innerText().catch(() => "")) ?? "";
    const phase = this.parser.detectPhaseFromDomSignals({ bodyText, hasAttack, hasFlee, hasExplore });
    return { phase, hasAttack, hasFlee, hasExplore, bodyText };
  }

  async safeClick(locator: string): Promise<{ clicked: boolean; reason?: string }>{
    const el = this.page.locator(locator).first();
    const text = ((await el.textContent().catch(() => "")) ?? "").trim();

    for (const rx of CLICK_BLOCKLIST_REGEX) {
      if (rx.test(text)) {
        return { clicked: false, reason: `blocked-by-blocklist: ${text}` };
      }
    }

    // Rate-limit tx generating clicks.
    // We can't perfectly know which clicks generate tx; we assume primary buttons do.
    const lower = text.toLowerCase();
    const mightTx = ["attack", "flee", "explore", "purchase", "potion", "confirm"].some((k) => lower.includes(k));
    if (mightTx && !this.limiter.canProceed()) {
      return { clicked: false, reason: "rate-limited" };
    }

    await el.click({ timeout: 5000 });
    return { clicked: true };
  }

  async clickAction(action: "attack" | "flee" | "explore"): Promise<{ clicked: boolean; reason?: string }> {
    if (action === "attack") return this.safeClick(SELECTORS.attackBtn);
    if (action === "flee") return this.safeClick(SELECTORS.fleeBtn);
    return this.safeClick(SELECTORS.exploreBtn);
  }

  async waitForSettled(timeoutMs = 15_000): Promise<void> {
    // coarse: wait for network to calm
    await this.page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => undefined);
    await this.page.waitForTimeout(750);
  }

  async detectUnexpectedModal(): Promise<{ found: boolean; preview?: string }> {
    const dialogs = await this.page.locator(SELECTORS.anyDialog).all();
    for (const d of dialogs) {
      const text = ((await d.textContent().catch(() => "")) ?? "").trim();
      if (!text) continue;
      const known = /level up|select stats|market|attack|flee|explore|defeated|ambushed|hit your/i.test(text.toLowerCase());
      if (!known && text.length > 10) {
        return { found: true, preview: text.slice(0, 200) };
      }
    }
    return { found: false };
  }
}
