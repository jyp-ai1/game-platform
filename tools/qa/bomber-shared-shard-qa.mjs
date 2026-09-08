/**
 * Bomber shared-shard Host/Guest smoke (BOMBER-A).
 * No engine helpers. No Solo/Practice. game29 Preview or Production only.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.QA_BASE_URL || "").replace(/\/$/, "");
const LABEL = process.env.QA_LABEL || "preview";
const OUT = join(ROOT, "docs/qa/cpo/mp-cpo-2nd-product-qa/prod-regression");
const EVID = join(OUT, `evidence/bomber-fix-${LABEL}`);
mkdirSync(EVID, { recursive: true });

if (!BASE) {
  console.error("QA_BASE_URL required");
  process.exit(2);
}
const host = new URL(BASE).hostname;
const isGame29 = host.includes("game29");
const isLegacy = host.includes("game-platform") && !host.includes("game29");
if (!isGame29 || isLegacy) {
  console.error(`Refuse: game29 only (${host})`);
  process.exit(2);
}

async function seed(ctx, id, nick) {
  await ctx.addInitScript(
    ({ id, nick }) => {
      localStorage.setItem("play29:device-id", id);
      localStorage.setItem("play29:nickname", nick);
    },
    { id, nick }
  );
}

async function clickEnter(page) {
  await page.getByTestId("mp-entry-lobby").waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  const btn = page.getByTestId("mp-enter-world");
  if (await btn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await btn.click();
    return true;
  }
  const enter = page.getByRole("button", { name: /^ENTER$/i });
  if (await enter.isVisible({ timeout: 5000 }).catch(() => false)) {
    await enter.click();
    return true;
  }
  return false;
}

function noFallbackText(url, text) {
  return !(
    url.includes("PRACTICE") ||
    url.includes("fallback=1") ||
    url.includes("BOMBER-SOLO") ||
    /연습모드|PRACTICE FALLBACK/i.test(text)
  );
}

async function measure(page) {
  return page.evaluate(() => {
    const board = document.querySelector("[data-mp-play-board]");
    const t = document.body.innerText;
    if (!board) {
      return {
        tiles: 0,
        w: 0,
        h: 0,
        you: /YOU|You/.test(t),
        fail: /Connection failed/i.test(t),
        connecting: /Connecting/i.test(t),
        text: t.slice(0, 400),
      };
    }
    const r = board.getBoundingClientRect();
    const tiles = [...board.querySelectorAll(".absolute")].filter((el) => {
      const s = getComputedStyle(el);
      return (parseFloat(s.width) >= 20 || parseFloat(s.height) >= 20) && s.position === "absolute";
    });
    return {
      tiles: tiles.length,
      w: Math.round(r.width),
      h: Math.round(r.height),
      you: /YOU|You/.test(t),
      fail: /Connection failed/i.test(t),
      connecting: /Connecting/i.test(t),
    };
  });
}

const RUN = Date.now().toString(36).toUpperCase();
const report = {
  gate: "bomber-shared-shard",
  label: LABEL,
  baseUrl: BASE,
  commit: process.env.QA_COMMIT || "43f6270",
  vercelProject: "game29",
  startedAt: new Date().toISOString(),
};

const browser = await chromium.launch({ headless: true });
try {
  const ctxH = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const ctxG = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seed(ctxH, `bf-h-${RUN}`, `BH${RUN.slice(-4)}`);
  await seed(ctxG, `bf-g-${RUN}`, `BG${RUN.slice(-4)}`);
  const hostPage = await ctxH.newPage();
  const guestPage = await ctxG.newPage();

  await hostPage.goto(`${BASE}/games/bomber`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await hostPage.waitForTimeout(1500);
  const detailText = await hostPage.evaluate(() => document.body.innerText);
  const href = await hostPage.getByRole("link", { name: /ENTER WORLD/i }).getAttribute("href").catch(() => null);
  report.detail = {
    enterWorld: /ENTER WORLD/i.test(detailText),
    multiplayer: /MULTIPLAYER/i.test(detailText),
    noSolo: !/\bPLAY SOLO\b/i.test(detailText) && !/\bPRACTICE\b/i.test(detailText) && !(href || "").includes("fallback=1"),
    href,
  };
  await hostPage.screenshot({ path: join(EVID, "01-detail.png"), fullPage: true });

  await hostPage.goto(`${BASE}/games/bomber/play?room=BOMBER-A`, { waitUntil: "load", timeout: 90_000 });
  await clickEnter(hostPage);
  await hostPage.getByTestId("bomber-map-select").waitFor({ state: "visible", timeout: 12_000 }).catch(() => {});
  const mapA = hostPage.getByTestId("bomber-map-A");
  if (await mapA.isVisible({ timeout: 4000 }).catch(() => false)) await mapA.click();
  const fail = hostPage.locator(':text("Connection failed")');
  if (await fail.isVisible({ timeout: 8000 }).catch(() => false)) {
    await hostPage.getByTestId("bomber-connect-retry").click().catch(() => {});
  }
  await hostPage.getByTestId("bomber-local-player").waitFor({ timeout: 40_000 }).catch(() => {});
  report.host = await measure(hostPage);
  report.host.noFallback = noFallbackText(hostPage.url(), await hostPage.evaluate(() => document.body.innerText));
  await hostPage.screenshot({ path: join(EVID, "02-host-world.png") });

  await guestPage.goto(`${BASE}/games/bomber/play?room=BOMBER-A`, { waitUntil: "load", timeout: 90_000 });
  await clickEnter(guestPage);
  await guestPage.getByTestId("bomber-map-select").waitFor({ state: "visible", timeout: 12_000 }).catch(() => {});
  const guestMap = guestPage.getByTestId("bomber-map-A");
  if (await guestMap.isVisible({ timeout: 4000 }).catch(() => false)) await guestMap.click();
  if (await guestPage.locator(':text("Connection failed")').isVisible({ timeout: 8000 }).catch(() => false)) {
    await guestPage.getByTestId("bomber-connect-retry").click().catch(() => {});
  }
  await guestPage.getByTestId("bomber-local-player").waitFor({ timeout: 40_000 }).catch(() => {});
  report.guest = await measure(guestPage);
  report.guest.noFallback = noFallbackText(guestPage.url(), await guestPage.evaluate(() => document.body.innerText));
  await guestPage.screenshot({ path: join(EVID, "03-guest-world.png") });

  const hostOk = report.host.w >= 240 && report.host.h >= 240 && report.host.tiles >= 40 && !report.host.fail && report.host.noFallback;
  const guestOk = report.guest.w >= 240 && report.guest.h >= 240 && report.guest.tiles >= 40 && !report.guest.fail && report.guest.noFallback;
  report.verdict = report.detail.enterWorld && report.detail.noSolo && hostOk && guestOk ? "PASS" : "FAIL";
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT, `bomber-fix-${LABEL}.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict, host: report.host, guest: report.guest, detail: report.detail }, null, 2));
  process.exit(report.verdict === "PASS" ? 0 : 1);
} finally {
  await browser.close();
}
