import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "https://game29-rcdr7lsec-jyp-ai1s-projects.vercel.app";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/mp-cto-verify-004");
mkdirSync(OUT, { recursive: true });

async function enterGame(page, slug) {
  const enter = page.locator('[data-testid="mp-enter-world"]');
  await enter.or(page.getByRole("button", { name: /^ENTER$/i })).first().waitFor({
    state: "visible",
    timeout: 45_000,
  });
  if ((await enter.count()) > 0) {
    await enter.click({ timeout: 15_000 });
  } else {
    await page.getByRole("button", { name: /^ENTER$/i }).first().click({ timeout: 15_000 });
  }
  if (slug === "bomber") {
    await page.waitForTimeout(800);
    if ((await page.locator('[data-testid="mp-mobile-control-pad"]').count()) === 0) {
      await page.locator('[data-testid="bomber-map-A"]').click({ force: true, timeout: 8000 }).catch(() => {});
    }
  }
  await page.waitForTimeout(2000);
}

const browser = await chromium.launch({ headless: true });
for (const slug of ["agar", "bomber"]) {
  const ctx = await browser.newContext({ hasTouch: true });
  const page = await ctx.newPage();
  await page.setViewportSize(devices["iPhone 13"].viewport);
  const room = slug === "bomber" ? "BOMBER-A" : "WORLD-VERIFY2";
  await page.goto(`${BASE}/games/${slug}/play?room=${room}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await enterGame(page, slug);
  const pad = page.locator('[data-testid="mp-mobile-control-pad"]');
  const ok = (await pad.count()) > 0 && (await pad.isVisible());
  console.log(`${slug}-mobile-pad`, ok ? "PASS" : "FAIL");
  await page.screenshot({ path: join(OUT, `${slug}-mobile-pad-v2.png`), fullPage: true });
  await ctx.close();
}
await browser.close();
