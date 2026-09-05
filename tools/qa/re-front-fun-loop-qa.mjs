/**
 * Re:Front Fun & Gameplay Loop QA
 * Usage: QA_BASE_URL=http://localhost:3000 node tools/qa/re-front-fun-loop-qa.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { invitePath } from "./lib/mp-common.mjs";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const OUT = join(process.cwd(), "docs/qa/cpo/re-front-fun-loop");
const SHOTS = join(OUT, "screenshots");
mkdirSync(SHOTS, { recursive: true });

const checks = [];

function mark(name, ok, detail = {}) {
  const row = { name, ok, ...detail, t: new Date().toISOString() };
  checks.push(row);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`, detail.note ?? detail.detail ?? "");
  return ok;
}

function cellToScreen(cx, cy, viewW, viewH, cam, zoom = 1.15) {
  const RF_GRID = 96;
  const RF_CELL = 8;
  const ox = viewW / 2 - cam.x * RF_CELL * zoom;
  const oy = viewH / 2 - cam.y * RF_CELL * zoom;
  return {
    x: ox + cx * RF_CELL * zoom + (RF_CELL * zoom) / 2,
    y: oy + cy * RF_CELL * zoom + (RF_CELL * zoom) / 2,
  };
}

async function enterGame(page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}${invitePath("re-front", "RF-FUN-QA", "debug=1")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.getByRole("button", { name: /START GAME/i }).click({ timeout: 45_000 });
  await page.waitForSelector('[data-testid="rf-game-shell"]', { timeout: 60_000 });
  await page.waitForTimeout(1500);
}

async function clickCell(page, cx, cy, cam = { x: 9, y: 9 }, zoom = 2.2) {
  const canvas = page.locator('[data-testid="rf-game-shell"] canvas').first();
  const box = await canvas.boundingBox();
  if (!box) return false;
  const p = cellToScreen(cx, cy, box.width, box.height, cam, zoom);
  await page.mouse.click(box.x + p.x, box.y + p.y);
  await page.waitForTimeout(500);
  return true;
}

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  const t0 = Date.now();

  await enterGame(page);
  await page.screenshot({ path: join(SHOTS, "01-start.png") });

  const nextAction = await page.locator('[data-testid="rf-next-action"]').innerText();
  mark("gate-5s-next-action", /NEXT|STEP 1|노란|확장/i.test(nextAction), { note: nextAction.slice(0, 80) });
  mark("gate-5s-legend", (await page.locator("body").innerText()).includes("Territory"), {
    note: "territory goal visible",
  });

  // First expand — click neutral near spawn (8,11) or use expand btn after select
  await clickCell(page, 8, 11);
  const expandBtn = page.locator('[data-testid="rf-expand-btn"]');
  if (await expandBtn.isEnabled().catch(() => false)) {
    await expandBtn.click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: join(SHOTS, "02-first-expand.png") });

  const mission30 = await page.evaluate(() => window.__RF_QA__?.());
  mark("gate-30s-first-expand", (mission30?.mission?.expandCount ?? 0) >= 1, {
    detail: { expandCount: mission30?.mission?.expandCount, elapsed: Date.now() - t0 },
  });

  await page.waitForTimeout(4000);
  await page.screenshot({ path: join(SHOTS, "03-growth.png") });
  const mission60 = await page.evaluate(() => window.__RF_QA__?.());
  mark("gate-60s-resources", (mission60?.me?.gold ?? 0) > 100 && (mission60?.me?.troops ?? 0) > 50, {
    detail: { gold: mission60?.me?.gold, troops: mission60?.me?.troops },
  });

  // Wait for attack-prompt phase
  for (let i = 0; i < 20; i++) {
    const m = await page.evaluate(() => window.__RF_QA__?.()?.mission?.phase);
    if (m === "attack-prompt" || m === "attack" || m === "counter" || m === "free") break;
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: join(SHOTS, "04-enemy.png") });
  const phase120 = await page.evaluate(() => window.__RF_QA__?.()?.mission?.phase);
  mark("gate-120s-enemy-phase", phase120 === "attack-prompt" || phase120 === "attack", {
    detail: { phase: phase120, elapsed: Date.now() - t0 },
  });

  // Try attack on red territory ~ (88, 8) area — click and attack
  await clickCell(page, 87, 8, { x: 48, y: 8 }, 1.2);
  const attackBtn = page.locator('[data-testid="rf-attack-btn"]');
  if (await attackBtn.isEnabled().catch(() => false)) {
    await attackBtn.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(SHOTS, "05-first-battle.png") });
  }
  const missionAtk = await page.evaluate(() => window.__RF_QA__?.());
  mark("gate-120s-attack", (missionAtk?.mission?.attackCount ?? 0) >= 1 || missionAtk?.mission?.phase === "counter", {
    detail: { phase: missionAtk?.mission?.phase, attacks: missionAtk?.mission?.attackCount },
  });

  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(SHOTS, "06-counter-attack.png") });

  const mission180 = await page.evaluate(() => window.__RF_QA__?.());
  const phase180 = mission180?.mission?.phase;
  mark("gate-180s-engagement", phase180 === "counter" || phase180 === "free" || (mission180?.mission?.attackCount ?? 0) >= 1, {
    detail: { phase: phase180, elapsed: Date.now() - t0 },
  });

  // Mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(SHOTS, "08-mobile.png") });
  const mobileMap = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="rf-game-shell"] canvas');
    if (!c) return { ok: false };
    const ctx = c.getContext("2d");
    if (!ctx) return { ok: false };
    const d = ctx.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data;
    const lum = d[0] + d[1] + d[2];
    return { ok: lum > 30, lum };
  });
  mark("mobile-map-visible", mobileMap.ok, { detail: mobileMap });

  await browser.close();

  const pass = checks.filter((c) => c.ok).length;
  const fail = checks.filter((c) => !c.ok).length;
  const report = { base: BASE, summary: { pass, fail, total: checks.length }, checks, finishedAt: new Date().toISOString() };
  writeFileSync(join(OUT, "verify-report.json"), JSON.stringify(report, null, 2));
  console.log(`\n=== Re:Front Fun Loop QA ${fail === 0 ? "PASS" : "FAIL"} ${pass}/${checks.length} ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
