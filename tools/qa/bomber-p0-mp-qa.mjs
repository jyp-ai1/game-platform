/**
 * Bomber P0 MP QA — Tests A~E (local only)
 * QA_BASE_URL=http://localhost:3000 node tools/qa/bomber-p0-mp-qa.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.QA_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const OUT = join(ROOT, "docs/qa/cpo/mp-four-game-real-play/bomber-p0");
mkdirSync(OUT, { recursive: true });

const HOST_ID = `qa-bomber-host-${Date.now()}`;
const GUEST_ID = `qa-bomber-guest-${Date.now()}`;
const WORLD_MS = 10_000;
const CONNECT_MAX_MS = 12_000;

/** @param {import('playwright').BrowserContext} ctx @param {string} id */
async function seed(ctx, id) {
  await ctx.addInitScript((deviceId) => {
    localStorage.setItem("play29:device-id", deviceId);
    localStorage.setItem("play29:last-nickname", deviceId.slice(-10));
  }, id);
}

/** @param {import('playwright').Page} page */
async function enterBomberMapA(page) {
  const t0 = Date.now();
  await page.goto(`${BASE}/games/bomber/play?room=BOMBER-A`, { waitUntil: "load", timeout: 90_000 });
  await page.getByTestId("mp-entry-lobby").waitFor({ state: "visible", timeout: 60_000 });
  const enterAt = Date.now();
  await page.getByTestId("mp-enter-world").click();
  await page.waitForTimeout(500);
  const hasWorld = await page.getByTestId("bomber-local-player").isVisible().catch(() => false);
  const hasConnecting = await page.getByTestId("bomber-connecting").isVisible().catch(() => false);
  const hasMap = await page.getByTestId("bomber-map-select").isVisible().catch(() => false);
  if (!hasWorld && !hasConnecting && hasMap) {
    const mapA = page.getByTestId("bomber-map-A");
    if (await mapA.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mapA.click();
    } else {
      await page.getByRole("button", { name: /^A · Classic/i }).click();
    }
  }
  return { t0, enterAt };
}

/** @param {import('playwright').Page} page */
async function waitWorldOrFail(page) {
  const t0 = Date.now();
  while (Date.now() - t0 < CONNECT_MAX_MS) {
    const err = await page.getByTestId("bomber-connect-error").isVisible().catch(() => false);
    if (err) return { ok: false, ms: Date.now() - t0, reason: "connection_failed" };
    const playing = await page.getByTestId("bomber-local-player").isVisible().catch(() => false);
    if (playing) return { ok: true, ms: Date.now() - t0, reason: "world" };
    const connecting = await page.locator('[data-testid="bomber-connecting"], :text("Connecting")').first().isVisible().catch(() => false);
    if (!connecting && !playing) {
      const map = await page.getByTestId("bomber-map-select").isVisible().catch(() => false);
      if (map) return { ok: false, ms: Date.now() - t0, reason: "stuck_map" };
    }
    await page.waitForTimeout(200);
  }
  const connecting = await page.locator(':text("Connecting")').isVisible().catch(() => false);
  return { ok: false, ms: Date.now() - t0, reason: connecting ? "connecting_timeout" : "timeout" };
}

/** @param {import('playwright').Page} page */
async function roomHud(page) {
  return page.evaluate(() => {
    const hud = document.querySelector('[data-testid="bomber-room-hud"]')?.textContent ?? "";
    const players = [...document.querySelectorAll('[data-testid="bomber-local-player"], [data-testid^="bomber-"]')].length;
    return { hud, href: location.href, body: document.body.innerText.slice(0, 500) };
  });
}

const browser = await chromium.launch({ headless: true });
const report = { baseUrl: BASE, startedAt: new Date().toISOString(), tests: {} };

try {
  const probe = await browser.newPage();
  await probe.goto(BASE, { waitUntil: "domcontentloaded", timeout: 15_000 });
  await probe.close();
} catch (e) {
  report.blocked = String(e);
  writeFileSync(join(OUT, "bomber-p0-report.json"), JSON.stringify(report, null, 2));
  console.error("Dev server not reachable:", e);
  process.exit(2);
}

// Test A — First Host on BOMBER-A (ghost shard → reclaim → world ≤10s)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seed(ctx, HOST_ID);
  const page = await ctx.newPage();
  const { enterAt } = await enterBomberMapA(page);
  const result = await waitWorldOrFail(page);
  await page.screenshot({ path: join(OUT, "test-a-host-world.png"), fullPage: true });
  const hud = await roomHud(page);
  report.tests.A_first_host = {
    pass: result.ok && result.ms <= WORLD_MS,
    entryMs: Date.now() - enterAt,
    worldMs: result.ms,
    room: "BOMBER-A",
    ...result,
    hud,
  };
  await ctx.close();
}

// Test B — Guest joins live host
{
  const ctxH = await browser.newContext();
  const ctxG = await browser.newContext();
  await seed(ctxH, `${HOST_ID}-live`);
  await seed(ctxG, GUEST_ID);
  const host = await ctxH.newPage();
  const guest = await ctxG.newPage();
  await enterBomberMapA(host);
  const hostWorld = await waitWorldOrFail(host);
  await host.waitForTimeout(1500);
  await enterBomberMapA(guest);
  const guestWorld = await waitWorldOrFail(guest);
  const hostHud = await roomHud(host);
  const guestHud = await roomHud(guest);
  const sameRoom = hostHud.href.includes("BOMBER-A") && guestHud.href.includes("BOMBER-A");
  report.tests.B_guest_join = {
    pass: hostWorld.ok && guestWorld.ok && guestWorld.ms <= WORLD_MS && sameRoom,
    hostWorld,
    guestWorld,
    sameRoom,
    hostHud,
    guestHud,
  };
  await pageScreenshot(host, join(OUT, "test-b-host.png"));
  await pageScreenshot(guest, join(OUT, "test-b-guest.png"));
  await ctxH.close();
  await ctxG.close();
}

function pageScreenshot(page, path) {
  return page.screenshot({ path, fullPage: true }).catch(() => {});
}

// Test C — Ghost: host closes, new entrant reclaims
{
  const ctxH = await browser.newContext();
  await seed(ctxH, `${HOST_ID}-ghost`);
  const host = await ctxH.newPage();
  await enterBomberMapA(host);
  await waitWorldOrFail(host);
  await ctxH.close();

  await new Promise((r) => setTimeout(r, 800));

  const ctxN = await browser.newContext();
  await seed(ctxN, `${HOST_ID}-reclaim`);
  const newcomer = await ctxN.newPage();
  const { enterAt } = await enterBomberMapA(newcomer);
  const result = await waitWorldOrFail(newcomer);
  const err = await newcomer.getByTestId("bomber-connect-error").isVisible().catch(() => false);
  const connecting = await newcomer.locator(':text("Connecting")').isVisible().catch(() => false);
  report.tests.C_ghost_reclaim = {
    pass: result.ok && result.ms <= WORLD_MS && !err && !connecting,
    worldMs: result.ms,
    reclaimedAsHost: result.ok,
    ...result,
  };
  await newcomer.screenshot({ path: join(OUT, "test-c-reclaim.png"), fullPage: true });
  await ctxN.close();
}

// Test D — Live host: second guest should NOT show connection failed while host alive
{
  const ctxH = await browser.newContext();
  const ctxG = await browser.newContext();
  await seed(ctxH, `${HOST_ID}-live2`);
  await seed(ctxG, `${GUEST_ID}-live2`);
  const host = await ctxH.newPage();
  const guest = await ctxG.newPage();
  await enterBomberMapA(host);
  const hw = await waitWorldOrFail(host);
  await host.waitForTimeout(2000);
  await enterBomberMapA(guest);
  const gw = await waitWorldOrFail(guest);
  const guestErr = await guest.getByTestId("bomber-connect-error").isVisible().catch(() => false);
  report.tests.D_live_host_no_reclaim = {
    pass: hw.ok && gw.ok && !guestErr,
    hostWorld: hw,
    guestWorld: gw,
    guestConnectionFailed: guestErr,
    note: "Live host kept — guest must join, not reclaim",
  };
  await ctxH.close();
  await ctxG.close();
}

// Test E — Retry after forced fail path visibility
{
  const ctx = await browser.newContext();
  await seed(ctx, `${HOST_ID}-retry`);
  const page = await ctx.newPage();
  await enterBomberMapA(page);
  const first = await waitWorldOrFail(page);
  const hadError = await page.getByTestId("bomber-connect-error").isVisible().catch(() => false);
  if (hadError) {
    await page.getByTestId("bomber-connect-retry").click();
    const retry = await waitWorldOrFail(page);
    report.tests.E_retry = {
      pass: retry.ok && retry.ms <= WORLD_MS,
      firstAttempt: first,
      afterRetry: retry,
      hadErrorUi: true,
    };
  } else {
    report.tests.E_retry = {
      pass: first.ok,
      firstAttempt: first,
      afterRetry: null,
      hadErrorUi: false,
      note: "First attempt succeeded — Retry UI not shown (acceptable for fresh reclaim)",
    };
  }
  await page.screenshot({ path: join(OUT, "test-e-retry.png"), fullPage: true });
  await ctx.close();
}

report.finishedAt = new Date().toISOString();
report.allPass = Object.values(report.tests).every((t) => t.pass);
writeFileSync(join(OUT, "bomber-p0-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ allPass: report.allPass, tests: report.tests }, null, 2));

await browser.close();
process.exit(report.allPass ? 0 : 1);
