#!/usr/bin/env node
/** Capture Before/After Epic screenshots for PM reports. */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(REPO, "docs/reports/sprint16/screenshots/epic1");

const BEFORE = process.env.BEFORE_URL ?? "https://game29-mqqsuwgtr-jyp-ai1s-projects.vercel.app";
const AFTER = process.env.AFTER_URL ?? "https://game29-8e0jp39xo-jyp-ai1s-projects.vercel.app";

const PAGES = [
  { path: "/", name: "home" },
  { path: "/journey", name: "journey" },
  { path: "/community", name: "community" },
  { path: "/profile", name: "profile" },
];

async function shot(page, url, file) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: file, fullPage: false });
  console.log("Wrote", file);
}

async function main() {
  const browser = await chromium.launch();
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    extraHTTPHeaders: bypass
      ? { "x-vercel-protection-bypass": bypass }
      : undefined,
  });
  const page = await context.newPage();

  for (const { path: p, name } of PAGES) {
    await shot(page, `${BEFORE}${p}`, path.join(OUT, `before-${name}.png`));
    await shot(page, `${AFTER}${p}`, path.join(OUT, `after-${name}.png`));
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
