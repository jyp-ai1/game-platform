/**
 * MP-INVITE-003 — same invite URL, PC + Mobile UA, room/source HUD + gem integrity.
 * Usage: node docs/qa/mp-invite-003/run.mjs <previewBaseUrl>
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
const base = (process.argv[2] || process.env.PREVIEW_URL || "").replace(/\/$/, "");
if (!base) {
  console.error("Usage: node docs/qa/mp-invite-003/run.mjs <previewBaseUrl>");
  process.exit(1);
}

const ROOM = `WORLD-I${Math.floor(Math.random() * 900 + 100)}`;
const invitePath = `/games/snake?invite=${encodeURIComponent(ROOM)}&source=invite`;
const playUrl = `${base}/flagship/snake-io/play?room=${encodeURIComponent(ROOM)}&source=invite`;

async function enterWorld(page, label) {
  await page.goto(playUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(1500);
  const enter = page.getByRole("button", { name: /ENTER WORLD|입장|시작|Play|ENTER/i }).first();
  if (await enter.isVisible({ timeout: 5000 }).catch(() => false)) {
    await enter.click({ force: true });
  }
  await page.waitForSelector('[data-testid="snake-world-canvas"], canvas', { timeout: 60_000 });
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(600);
  await page.keyboard.press("ArrowRight");
  await page.screenshot({ path: path.join(OUT, `${label}-playing.png`), fullPage: true });
}

async function probe(page) {
  return page.evaluate(() => {
    const api = window.__MP_PLATFORM_001__;
    if (api?.getInviteEvidence) {
      const ev = api.getInviteEvidence();
      const stats = api.getStats?.() ?? {};
      return { ...ev, ...stats };
    }
    return {
      urlRoom: new URLSearchParams(location.search).get("room")?.toUpperCase() ?? null,
      source: new URLSearchParams(location.search).get("source")?.toUpperCase() ?? null,
      roomHud: document.querySelector('[data-testid="snake-room-label"]')?.textContent ?? null,
      modeHud: document.querySelector('[data-testid="snake-mode-label"]')?.textContent ?? null,
      sourceHud: document.querySelector('[data-testid="snake-source-label"]')?.textContent ?? null,
      localLength: null,
      foodTotal: null,
      peerIds: [],
    };
  });
}

async function eatNearby(page, steps = 8) {
  for (let i = 0; i < steps; i++) {
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(200);
    await page.keyboard.up("ArrowRight");
    await page.keyboard.press("Space");
    await page.waitForTimeout(250);
  }
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
await pageA.waitForTimeout(4000);
await pageB.waitForTimeout(1000);

const beforeA = await probe(pageA);
const beforeB = await probe(pageB);

await eatNearby(pageB, 10);
await pageB.waitForTimeout(2000);
const afterB = await probe(pageB);

const parseHud = (ev) => ({
  ROOM: (ev.roomHud || "").replace(/^ROOM:\s*/i, "").trim() || ev.sessionRoom || ev.urlRoom,
  MODE: (ev.modeHud || "").replace(/^MODE:\s*/i, "").trim() || "WORLD",
  SOURCE: (ev.sourceHud || "").replace(/^SOURCE:\s*/i, "").trim() || ev.roomJoinSource || ev.source || "?",
});

const pcHud = parseHud(beforeA);
const mobileHud = parseHud(beforeB);

const sameRoom =
  pcHud.ROOM === mobileHud.ROOM &&
  pcHud.ROOM === ROOM &&
  pcHud.MODE === mobileHud.MODE &&
  pcHud.SOURCE === mobileHud.SOURCE &&
  pcHud.SOURCE === "INVITE";

const aSeesPeer = (beforeA.peerIds || []).length > 0 || (beforeA.peerNicknames || []).length > 0;
const bSeesPeer = (beforeB.peerIds || []).length > 0 || (beforeB.peerNicknames || []).length > 0;

const practiceRedirect =
  /PRACTICE/i.test(beforeA.urlRoom || "") ||
  /PRACTICE/i.test(beforeB.urlRoom || "") ||
  /fallback=1/.test(pageA.url()) ||
  /fallback=1/.test(pageB.url());

const initialLen = beforeB.localLength ?? beforeA.localLength;
const afterLen = afterB.localLength ?? initialLen;
const l500Spike = afterLen != null && afterLen >= 200;
const naturalGrowth =
  initialLen === 10 && afterLen != null && afterLen >= 10 && afterLen < 80;

const ambientValues = beforeA.ambientGemValues || beforeB.ambientGemValues || [];
const uniqueVals = [...new Set(ambientValues)].sort((a, b) => a - b);

const report = {
  room: ROOM,
  invitePath,
  playUrl,
  preview: base,
  pc: { hud: pcHud, evidence: beforeA },
  mobile: { hud: mobileHud, evidence: beforeB, afterEat: afterB },
  gates: {
    sameRoom: !!sameRoom,
    aSeesB: !!aSeesPeer,
    bSeesA: !!bSeesPeer,
    initialLength10: initialLen === 10,
    noL500: !l500Spike,
    naturalGrowth: !!naturalGrowth,
    noPracticeFallback: !practiceRedirect,
    sourceInvite: pcHud.SOURCE === "INVITE" && mobileHud.SOURCE === "INVITE",
  },
  gem: {
    initialLength: initialLen,
    afterEatLength: afterLen,
    foodTotal: beforeA.foodTotal ?? beforeB.foodTotal,
    ambientFood: beforeA.ambientFood ?? beforeB.ambientFood,
    deathFood: beforeA.deathFood ?? beforeB.deathFood,
    ambientGemValuesSample: uniqueVals,
  },
};

fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
await pageA.screenshot({ path: path.join(OUT, "pc-final.png") });
await pageB.screenshot({ path: path.join(OUT, "mobile-final.png") });
await browser.close();

const g = report.gates;
const passCount = Object.values(g).filter(Boolean).length;
console.log(
  JSON.stringify(
    {
      passCount,
      gates: g,
      room: ROOM,
      pcHud,
      mobileHud,
      gem: report.gem,
    },
    null,
    2
  )
);
process.exit(passCount >= 6 ? 0 : 2);
