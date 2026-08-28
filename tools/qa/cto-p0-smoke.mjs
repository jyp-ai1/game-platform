/**
 * CTO P0 smoke — invite link contract + mobile pad presence.
 * Usage (PowerShell):
 *   $env:QA_BASE_URL="https://game29-xxx.vercel.app"; node tools/qa/cto-p0-smoke.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const BASE =
  process.env.QA_BASE_URL ?? "https://game29-2o97byfqa-jyp-ai1s-projects.vercel.app";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/cto-p0-smoke");
const COMMIT = process.env.QA_COMMIT ?? "local";

mkdirSync(OUT, { recursive: true });

const MP = [
  { slug: "snake", room: "WORLD-CTO" },
  { slug: "agar", room: "WORLD-CTO" },
  { slug: "bomber", room: "BOMBER-A" },
];

const report = {
  base: BASE,
  commit: COMMIT,
  startedAt: new Date().toISOString(),
  checks: [],
};

function mark(name, ok, detail = {}) {
  report.checks.push({ name, ok, ...detail, t: new Date().toISOString() });
  return ok;
}

function invitePath(slug, room) {
  return `/games/${slug}/play?room=${encodeURIComponent(room)}`;
}

async function probeInviteLinks(page) {
  const results = [];
  for (const g of MP) {
    await page.goto(`${BASE}/games/${g.slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.locator('[data-testid="game-detail-page"]').waitFor({ timeout: 30_000 });
    const copyBtn = page.locator('[data-testid="game-detail-invite-copy"]');
    const shareBtn = page.locator('[data-testid="game-detail-share-btn"]');
    const hasCopy = (await copyBtn.count()) > 0;
    const hasShare = (await shareBtn.count()) > 0;
    mark(`${g.slug}-invite-buttons`, hasCopy && hasShare, { hasCopy, hasShare });

    await page.evaluate(async () => {
      if (!navigator.clipboard?.writeText) return;
      await navigator.clipboard.writeText("");
    });
    await copyBtn.click();
    await page.waitForTimeout(400);
    const clip = await page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText();
      } catch {
        return "";
      }
    });
    const expectPath = invitePath(g.slug, g.room.includes("WORLD") ? "WORLD-" : "BOMBER-");
    const okFormat =
      clip.includes(`/games/${g.slug}/play?room=`) &&
      (g.slug === "bomber"
        ? clip.includes("BOMBER-")
        : clip.includes("WORLD-"));
    mark(`${g.slug}-invite-url-format`, okFormat, { clip: clip.slice(0, 120) });
    results.push({ slug: g.slug, clip, okFormat });
  }
  return results;
}

async function probeMobilePad(page, slug) {
  const iphone = devices["iPhone 13"];
  await page.setViewportSize(iphone.viewport);
  const path = invitePath(slug, slug === "bomber" ? "BOMBER-A" : "WORLD-SMOKE");
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  if (slug === "snake") {
    await page.waitForURL(/snake-io\/play/, { timeout: 45_000 }).catch(() => {});
  }
  const enter = page.locator('[data-testid="mp-enter-world"]');
  if ((await enter.count()) > 0) {
    await enter.click({ timeout: 15_000 }).catch(() => {});
    if (slug === "bomber") {
      const mapA = page.locator('[data-testid="bomber-map-A"]');
      if ((await mapA.count()) > 0) await mapA.click({ timeout: 10_000 }).catch(() => {});
    }
  }
  await page.waitForTimeout(2500);
  const pad = page.locator('[data-testid="mp-mobile-control-pad"]');
  const visible = (await pad.count()) > 0;
  mark(`${slug}-mobile-pad`, visible);
  await page.screenshot({ path: join(OUT, `${slug}-mobile-pad.png`) });
  return visible;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();

  try {
    await probeInviteLinks(page);
    for (const g of MP) {
      await probeMobilePad(page, g.slug);
    }
    const allPass = report.checks.every((c) => c.ok);
    report.finishedAt = new Date().toISOString();
    report.pass = allPass;
    writeFileSync(join(OUT, "smoke-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    process.exit(allPass ? 0 : 1);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
