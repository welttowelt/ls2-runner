import { chromium } from "playwright";

// Helper for selector calibration.
// Usage: pnpm/npm run inspect

async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("https://lootsurvivor.io/survivor", { waitUntil: "domcontentloaded" });
  console.log("Opened:", page.url());
  console.log("Interact manually, then press Enter in this terminal to dump DOM excerpt.");

  await new Promise<void>((resolve) => process.stdin.once("data", () => resolve()));

  const html = await page.content();
  console.log(html.slice(0, 20000));

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
