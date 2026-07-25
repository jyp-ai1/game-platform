#!/usr/bin/env node
/** Sprint16 Epic3–7 after screenshots (local or preview). */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(REPO, "docs/reports/sprint16/screenshots/epic3-7");
const BASE = process.env.AFTER_URL ?? "http://localhost:3020";

const PAGES = [
  { path: "/", name: "home-desktop" },
  { path: "/games/2048", name: "game-detail" },
  { path: "/community", name: "community" },
  { path: "/profile", name: "profile" },
  { path: "/admin/health", name: "admin-health" },
];

async function shot(page, url, file, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: file, fullPage: false });
  console.log("Wrote", file);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const context = await browser.newContext({
    extraHTTPHeaders: bypass
      ? { "x-vercel-protection-bypass": bypass }
      : undefined,
  });
  const page = await context.newPage();

  for (const { path: p, name } of PAGES) {
    await shot(page, `${BASE}${p}`, path.join(OUT, `${name}-1280.png`), {
      width: 1280,
      height: 900,
    });
    if (p === "/") {
      await shot(page, `${BASE}${p}`, path.join(OUT, "home-mobile-375.png"), {
        width: 375,
        height: 812,
      });
    }
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
