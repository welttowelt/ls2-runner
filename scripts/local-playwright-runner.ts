import { chromium, BrowserContext, Page } from "playwright";
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), ".pw-profile");
const START_URL = "https://lootsurvivor.io/survivor";

async function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function getPage(ctx: BrowserContext): Promise<Page> {
  const pages = ctx.pages();
  if (pages.length) return pages[0];
  return await ctx.newPage();
}

async function clickByText(page: Page, text: RegExp) {
  const button = page.getByRole("button", { name: text });
  if (await button.count()) {
    const el = button.first();
    const box = await el.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: 20 }).catch(() => null);
      return true;
    }
    await el.click({ timeout: 800, force: true }).catch(() => null);
    return true;
  }
  return false;
}

async function ensureInPlay(page: Page) {
  const url = page.url();
  if (!url.includes("/survivor")) {
    await page.goto(START_URL, { waitUntil: "domcontentloaded" }).catch(() => null);
  }
  if (!page.url().includes("/survivor/play")) {
    await clickByText(page, /Practice for Free/i);
    await page.waitForURL(/\/survivor\/play\?id=/, { timeout: 5000 }).catch(() => null);
  }
}

async function dumpButtons(page: Page) {
  const buttons = page.locator("button");
  const count = await buttons.count();
  const out: string[] = [];
  for (let i = 0; i < Math.min(count, 40); i++) {
    const b = buttons.nth(i);
    const text = (await b.innerText().catch(() => "")).trim();
    const disabled = await b.isDisabled().catch(() => false);
    out.push(`${i}: ${text} ${disabled ? "[disabled]" : ""}`.trim());
  }
  console.log("[buttons]", out.join(" | "));
}

async function loop(page: Page) {
  // Order matters: resolve interrupts first
  const actions: Array<RegExp> = [
    /Play Again|Try Again|Restart|New Run/i,
    /Select Stats|Confirm/i,
    /Continue|OK|Next|Close|Dismiss|Buy Items/i,
    /^FLEE\b/i,
    /^ATTACK\b/i,
    /^EXPLORE\b/i,
  ];
  for (const re of actions) {
    const did = await clickByText(page, re);
    if (did) return re.toString();
  }
  // fallback: click any "+" stat button if present
  const plus = page.getByRole("button", { name: "+" });
  if (await plus.count()) {
    const box = await plus.first().boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: 20 });
      return "+";
    }
  }
  return null;
}

async function main() {
  await ensureDir(DATA_DIR);
  const ctx = await chromium.launchPersistentContext(DATA_DIR, {
    headless: false,
    viewport: { width: 1280, height: 800 },
  });

  const page = await getPage(ctx);
  await ensureInPlay(page);

  console.log("LS2 local Playwright loop running. Keep this process alive.");
  let idleCycles = 0;
  // continuous loop
  while (true) {
    await ensureInPlay(page);
    const did = await loop(page);
    if (did) {
      console.log(`[action] ${did} @ ${page.url()}`);
      idleCycles = 0;
    } else {
      idleCycles++;
      if (idleCycles % 20 === 0) {
        console.log(`[idle] url=${page.url()}`);
        await dumpButtons(page).catch(() => null);
      }
    }
    await page.waitForTimeout(250);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
