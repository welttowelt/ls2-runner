import { chromium, type Browser, type Page } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "../utils/logger.js";
import type { Phase } from "../types.js";
import { GameStateParser } from "./stateParser.js";

// Read-only browser sensor:
// - Intercepts GraphQL for robust state signals
// - Provides phase detection + screenshots
// - Never clicks buttons

export class GameStateReader {
  private browser!: Browser;
  private page!: Page;
  private readonly parser = new GameStateParser();

  constructor(private readonly screenshotsDir = "./screenshots") {}

  getParser() {
    return this.parser;
  }

  async launch(headless = true) {
    await fs.mkdir(this.screenshotsDir, { recursive: true });
    this.browser = await chromium.launch({ headless });
    this.page = await this.browser.newPage();

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

    await this.page.goto("https://lootsurvivor.io/survivor", { waitUntil: "domcontentloaded" });
    logger.info({ url: this.page.url() }, "sensor browser launched");
  }

  async close() {
    await this.browser?.close();
  }

  async screenshot(runId: string, tick: number, label: string) {
    const file = `${runId}-tick${tick}-${label}.png`;
    const full = path.join(this.screenshotsDir, file);
    await this.page.screenshot({ path: full, fullPage: false });
    return full;
  }

  async detectPhase(): Promise<Phase> {
    const bodyText = (await this.page.locator("body").innerText().catch(() => "")) ?? "";
    const hasAttack = await this.page.locator("button:has-text('Attack'), button:has-text('ATTACK')").first().isVisible().catch(() => false);
    const hasFlee = await this.page.locator("button:has-text('Flee'), button:has-text('FLEE')").first().isVisible().catch(() => false);
    const hasExplore = await this.page.locator("button:has-text('Explore'), button:has-text('EXPLORE')").first().isVisible().catch(() => false);
    return this.parser.detectPhaseFromDomSignals({ bodyText, hasAttack, hasFlee, hasExplore });
  }
}
