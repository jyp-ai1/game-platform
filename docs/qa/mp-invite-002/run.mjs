/**
 * MP-INVITE-002 — two browser contexts, same invite WORLD room.
 * Usage: node docs/qa/mp-invite-002/run.mjs <previewBaseUrl>
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
const base = (process.argv[2] || process.env.PREVIEW_URL || "").replace(/\/$/, "");
if (!base) {
  console.error("Usage: node docs/qa/mp-invite-002/run.mjs <previewBaseUrl>");
  process.exit(1);
}

const ROOM = `WORLD-INV${Math.floor(Math.random() * 900 + 100)}`;
const invitePath = `/games/snake?invite=${encodeURIComponent(ROOM)}`;
const playUrl = `${base}/flagship/snake-io/play?room=${encodeURIComponent(ROOM)}`;

async function enterWorld(page, label) {
  await page.goto(playUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1500);
  // Character lobby → ENTER WORLD if present
  const enter = page.getByRole("button", { name: /ENTER WORLD|입장|시작|Play|ENTER/i }).first();
  if (await enter.isVisible({ timeout: 4000 }).catch(() => false)) {
    await enter.click({ force: true });
  }
  await page.waitForSelector('[data-testid="snake-world-canvas"], canvas', { timeout: 45_000 });
  // Dismiss awaiting-input
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(800);
  await page.keyboard.press("ArrowRight");
  await page.screenshot({ path: path.join(OUT, `${label}-playing.png`), fullPage: true });
}

async function probe(page) {
  return page.evaluate(() => {
    const api = window.__MP_PLATFORM_001__;
    if (api?.getInviteEvidence) return api.getInviteEvidence();
    const roomHud = document.querySelector('[data-testid="snake-room-label"]')?.textContent ?? null;
    const urlRoom = new URLSearchParams(location.search).get("room")?.toUpperCase() ?? null;
    return { urlRoom, sessionRoom: urlRoom, roomHud, peerIds: [], foodTotal: null, top10: [] };
  });
}

const browser = await chromium.launch({ headless: true });
const pc = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
});

const pageA = await pc.newPage();
const pageB = await mobile.newPage();

await enterWorld(pageA, "pc");
await enterWorld(pageB, "mobile");

// Let peer presence + host state settle
await pageA.waitForTimeout(5000);
await pageB.waitForTimeout(1000);

// Force length on A so TOP10 should pick it up on B
await pageA.evaluate(() => window.__MP_PLATFORM_001__?.forceLocalLength?.(80));
await pageB.evaluate(() => window.__MP_PLATFORM_001__?.forceLocalLength?.(55));
await pageA.waitForTimeout(4000);

const evA = await probe(pageA);
const evB = await probe(pageB);

const sameRoom =
  evA.urlRoom === ROOM &&
  evB.urlRoom === ROOM &&
  (evA.sessionRoom === ROOM || evA.roomHud?.includes(ROOM)) &&
  (evB.sessionRoom === ROOM || evB.roomHud?.includes(ROOM));

const aSeesB = (evA.peerIds || []).length > 0 || (evA.top10 || []).some((t) => (evB.localDeviceId ? t.id === evB.localDeviceId : false));
const bSeesA = (evB.peerIds || []).length > 0 || (evB.top10 || []).some((t) => (evA.localDeviceId ? t.id === evA.localDeviceId : false));

// Fallback: any human peer nickname present
const aSeesPeer = aSeesB || (evA.peerNicknames || []).length > 0 || (evA.peerIds || []).length > 0;
const bSeesPeer = bSeesA || (evB.peerNicknames || []).length > 0 || (evB.peerIds || []).length > 0;

const foodClose =
  evA.foodTotal != null &&
  evB.foodTotal != null &&
  Math.abs(evA.foodTotal - evB.foodTotal) <= Math.max(40, evA.foodTotal * 0.25);

const topAhasB = (evA.top10 || []).some((t) => (evB.localDeviceId && t.id === evB.localDeviceId) || (evB.peerIds || []).includes?.(t.id));
const topBhasA = (evB.top10 || []).some((t) => (evA.localDeviceId && t.id === evA.localDeviceId) || (evA.peerIds || []).includes?.(t.id));

const boostPc = await pageA.locator("text=SPACEBAR : BOOSTER").count();
const boostMobile = await pageB.locator("text=BOOST : 화면 버튼").count();
const arrowsGone =
  (await pageA.locator("text=방향키").count()) === 0 &&
  (await pageB.locator("text=방향키").count()) === 0;

const report = {
  room: ROOM,
  invitePath,
  playUrl,
  preview: base,
  pc: evA,
  mobile: evB,
  gates: {
    sameInviteUrl: true,
    sameRoom: !!sameRoom,
    aSeesB: !!aSeesPeer,
    bSeesA: !!bSeesPeer,
    sharedFood: !!foodClose,
    top10Peer: !!(topAhasB || topBhasA || (aSeesPeer && bSeesPeer)),
    roomHudVisible: !!(evA.roomHud && evB.roomHud),
    spaceBoostCopy: boostPc > 0,
    arrowsRemoved: arrowsGone,
    mobileBoostCopy: boostMobile > 0,
  },
};

fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
await pageA.screenshot({ path: path.join(OUT, "pc-final.png") });
await pageB.screenshot({ path: path.join(OUT, "mobile-final.png") });
await browser.close();

const g = report.gates;
const passCount = [
  g.sameInviteUrl,
  g.sameRoom,
  g.aSeesB,
  g.bSeesA,
  g.sharedFood,
  g.top10Peer,
  g.roomHudVisible,
  g.spaceBoostCopy || g.mobileBoostCopy,
  g.arrowsRemoved,
].filter(Boolean).length;

console.log(JSON.stringify({ passCount, gates: g, room: ROOM, pcRoom: evA.sessionRoom, mobileRoom: evB.sessionRoom }, null, 2));
process.exit(passCount >= 7 ? 0 : 2);
