/**
 * PHASE-2.2 — Snake invite clipboard + room consistency probe.
 * Usage: node docs/qa/snake-phase2-2/invite-probe.mjs <previewBaseUrl>
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
const base = (process.argv[2] || process.env.PREVIEW_URL || "").replace(/\/$/, "");
if (!base) {
  console.error("Usage: node docs/qa/snake-phase2-2/invite-probe.mjs <previewBaseUrl>");
  process.exit(1);
}

const detailUrl = `${base}/games/snake`;

async function grantClipboard(context) {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
}

async function clickShareAndReadClipboard(page) {
  await page.goto(detailUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForSelector('[data-testid="game-detail-share-btn"]', { timeout: 30_000 });

  // Force PC copy path (disable share sheet)
  await page.evaluate(() => {
    try {
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    } catch {
      /* ignore */
    }
  });

  await page.click('[data-testid="game-detail-share-btn"]');
  await page.waitForTimeout(800);

  const status = await page.locator('[data-testid="game-detail-share-status"]').textContent().catch(() => null);
  const clipboard = await page.evaluate(async () => {
    try {
      return await navigator.clipboard.readText();
    } catch (e) {
      return `ERR:${e?.message || e}`;
    }
  });

  const pinned = await page.evaluate(() => {
    try {
      return window.localStorage.getItem("play29:active-room");
    } catch {
      return null;
    }
  });

  return { status, clipboard, pinned };
}

async function openInviteAndReadHud(page, inviteUrl) {
  await page.goto(inviteUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(1200);
  const enter = page.getByRole("button", { name: /ENTER WORLD|입장|시작|Play|ENTER/i }).first();
  if (await enter.isVisible({ timeout: 5000 }).catch(() => false)) {
    await enter.click({ force: true });
  }
  await page.waitForSelector('[data-testid="snake-world-canvas"], canvas', { timeout: 60_000 }).catch(() => null);
  await page.waitForTimeout(2000);

  return page.evaluate(() => {
    const urlRoom = new URLSearchParams(location.search).get("room")?.toUpperCase() ?? null;
    const roomHud =
      document.querySelector('[data-testid="snake-room-label"]')?.textContent?.trim() ?? null;
    const api = window.__MP_PLATFORM_001__;
    const ev = api?.getInviteEvidence?.() ?? {};
    return {
      urlRoom,
      roomHud,
      sessionRoom: ev.sessionRoom ?? null,
      href: location.href,
    };
  });
}

const browser = await chromium.launch({ headless: true });
const pc = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await grantClipboard(pc);
const page = await pc.newPage();

const share = await clickShareAndReadClipboard(page);
const roomMatch = (share.clipboard || "").match(/room=([^&]+)/i);
const roomFromClipboard = roomMatch ? decodeURIComponent(roomMatch[1]).toUpperCase() : null;

const roomOk =
  !!roomFromClipboard &&
  /^WORLD-[A-Z0-9]+$/.test(roomFromClipboard) &&
  (share.clipboard || "").includes(`room=${roomFromClipboard}`);

const toastOk = (share.status || "").includes("초대 링크가 복사되었습니다");

let hud = null;
let roomConsistency = false;
if (roomFromClipboard) {
  const inviteUrl = `${base}/flagship/snake-io/play?room=${encodeURIComponent(roomFromClipboard)}&source=invite`;
  hud = await openInviteAndReadHud(page, inviteUrl);
  const hudRoom = (hud.roomHud || "")
    .replace(/^ROOM:\s*/i, "")
    .trim()
    .toUpperCase();
  roomConsistency =
    roomFromClipboard === (hud.urlRoom || "").toUpperCase() &&
    (!hudRoom || hudRoom === roomFromClipboard || hudRoom.includes(roomFromClipboard));
}

// Mobile share availability (fallback path still copies)
const iphone = devices["iPhone 13"];
const mobileCtx = await browser.newContext({ ...iphone });
await grantClipboard(mobileCtx);
const mobilePage = await mobileCtx.newPage();
await mobilePage.goto(detailUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
await mobilePage.waitForSelector('[data-testid="game-detail-share-btn"]', { timeout: 30_000 });
const mobileShareFn = await mobilePage.evaluate(() => typeof navigator.share === "function");
// Force fallback copy on mobile when share cancelled / disabled
await mobilePage.evaluate(() => {
  try {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  } catch {
    /* ignore */
  }
});
await mobilePage.click('[data-testid="game-detail-share-btn"]');
await mobilePage.waitForTimeout(800);
const mobileClipboard = await mobilePage.evaluate(async () => {
  try {
    return await navigator.clipboard.readText();
  } catch (e) {
    return `ERR:${e?.message || e}`;
  }
});
const mobileStatus = await mobilePage
  .locator('[data-testid="game-detail-share-status"]')
  .textContent()
  .catch(() => null);
const mobileFallbackOk =
  /room=WORLD-[A-Z0-9]+/i.test(mobileClipboard || "") &&
  (mobileStatus || "").includes("초대 링크가 복사되었습니다");

const report = {
  phase: "PHASE-2.2",
  preview: base,
  linkGeneration: roomOk ? "PASS" : "FAIL",
  clipboard: roomOk && !String(share.clipboard).startsWith("ERR:") ? "PASS" : "FAIL",
  toast: toastOk ? "PASS" : "FAIL",
  roomIdConsistency: roomConsistency ? "PASS" : "FAIL",
  mobileShareAvailable: mobileShareFn,
  mobileShareFallback: mobileFallbackOk ? "PASS" : "FAIL",
  evidence: {
    share,
    roomFromClipboard,
    hud,
    mobileClipboard,
    mobileStatus,
  },
};

fs.writeFileSync(path.join(OUT, "invite-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

await browser.close();

const fail =
  report.linkGeneration !== "PASS" ||
  report.clipboard !== "PASS" ||
  report.roomIdConsistency !== "PASS" ||
  report.mobileShareFallback !== "PASS";
process.exit(fail ? 1 : 0);
