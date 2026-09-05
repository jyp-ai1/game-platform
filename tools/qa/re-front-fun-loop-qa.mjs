/**
 * Re:Front Fun & Gameplay Loop QA
 * Usage: QA_BASE_URL=https://game29-xxx.vercel.app QA_COMMIT=395dc98 node tools/qa/re-front-fun-loop-qa.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { invitePath } from "./lib/mp-common.mjs";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const COMMIT = process.env.QA_COMMIT ?? "local";
const OUT = join(process.cwd(), "docs/qa/cpo/re-front-fun-loop");
const SHOTS = join(OUT, "screenshots");
mkdirSync(SHOTS, { recursive: true });

const RF_CELL = 8;

const checks = [];

function mark(name, ok, detail = {}) {
  const row = { name, ok, ...detail, t: new Date().toISOString() };
  checks.push(row);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`, detail.note ?? detail.detail ?? "");
  return ok;
}

async function canvasBox(page) {
  const canvas = page.locator('[data-testid="rf-game-shell"] canvas').first();
  return canvas.boundingBox();
}

/** After fitViewToPlayer, nation center ≈ canvas center. Offset in grid cells. */
async function clickCanvasOffset(page, dxCells, dyCells) {
  const box = await canvasBox(page);
  if (!box) return false;
  const zoom = Math.min(3.2, Math.max(0.55, Math.min(box.width, box.height) / (22 * RF_CELL)));
  const cellPx = RF_CELL * zoom;
  await page.mouse.click(box.x + box.width / 2 + dxCells * cellPx, box.y + box.height / 2 + dyCells * cellPx);
  await page.waitForTimeout(450);
  return true;
}

async function tryExpand(page) {
  const expandBtn = page.locator('[data-testid="rf-expand-btn"]');
  if (await expandBtn.isEnabled().catch(() => false)) {
    await expandBtn.click();
    await page.waitForTimeout(700);
    return true;
  }
  return false;
}

async function expandUntil(page, goal, maxAttempts = 12) {
  const offsets = [
    [2, 0],
    [2, 0],
    [1, 0],
    [3, 0],
    [0, 2],
    [2, 1],
    [-2, 0],
    [0, -2],
  ];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const count = await page.evaluate(() => window.__RF_QA__?.()?.mission?.expandCount ?? 0);
    if (count >= goal) return count;
    const pair = offsets[attempt % offsets.length];
    const dx = pair[0];
    const dy = pair[1];
    await clickCanvasOffset(page, dx, dy);
    await tryExpand(page);
  }
  return await page.evaluate(() => window.__RF_QA__?.()?.mission?.expandCount ?? 0);
}

async function enterGame(page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}${invitePath("re-front", "RF-FUN-QA", "debug=1")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.getByRole("button", { name: /START GAME/i }).click({ timeout: 45_000 });
  await page.waitForSelector('[data-testid="rf-game-shell"]', { timeout: 60_000 });
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "📍" }).click({ timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(600);
}

async function bruteForceAttack(page) {
  for (let dx = -3; dx <= 3; dx++) {
    for (let dy = -3; dy <= 3; dy++) {
      await clickCanvasOffset(page, dx, dy);
      await page.waitForTimeout(350);
      const q = await page.evaluate(() => window.__RF_QA__?.());
      if (q?.canAttackSelected) {
        const attackBtn = page.locator('[data-testid="rf-attack-btn"]');
        if ((await attackBtn.count()) > 0 && (await attackBtn.isEnabled().catch(() => false))) {
          await attackBtn.click();
          await page.waitForTimeout(1500);
          return true;
        }
      }
    }
  }
  return false;
}

async function waitPhase(page, phases, timeoutMs = 30_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const m = await page.evaluate(() => window.__RF_QA__?.()?.mission?.phase);
    if (phases.includes(m)) return m;
    await page.waitForTimeout(400);
  }
  return await page.evaluate(() => window.__RF_QA__?.()?.mission?.phase);
}

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  const t0 = Date.now();

  await enterGame(page);
  await page.screenshot({ path: join(SHOTS, "01-start.png") });

  const nextAction = await page.locator('[data-testid="rf-next-action"]').innerText();
  mark("gate-5s-next-action", /NEXT|STEP|노란|확장/i.test(nextAction), { note: nextAction.replace(/\s+/g, " ").slice(0, 100) });
  mark("gate-5s-no-confusion", /STEP 1|내 영토|Territory.*70/i.test(nextAction), {
    note: "goal + next action visible",
  });

  const expandCount = await expandUntil(page, 1);
  await page.screenshot({ path: join(SHOTS, "02-first-expand.png") });
  mark("gate-30s-first-expand", expandCount >= 1, {
    detail: { expandCount, elapsed: Date.now() - t0 },
  });

  await expandUntil(page, 3, 20);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: join(SHOTS, "03-growth.png") });
  const mission60 = await page.evaluate(() => window.__RF_QA__?.());
  mark("gate-60s-resources", (mission60?.me?.gold ?? 0) > 100 && (mission60?.mission?.expandCount ?? 0) >= 3, {
    detail: {
      gold: mission60?.me?.gold,
      troops: mission60?.me?.troops,
      pct: mission60?.me?.territoryPct,
      phase: mission60?.mission?.phase,
    },
  });

  const phase120 = await waitPhase(page, ["attack-prompt", "attack", "counter", "free"], 25_000);
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(SHOTS, "04-enemy.png") });
  mark("gate-120s-enemy-phase", phase120 === "attack-prompt" || phase120 === "attack", {
    detail: { phase: phase120, elapsed: Date.now() - t0 },
  });

  // Bridge toward Red Kingdom if needed, then attack
  await expandUntil(page, 4);
  await bruteForceAttack(page);
  await page.screenshot({ path: join(SHOTS, "05-first-battle.png") });
  const missionAtk = await page.evaluate(() => window.__RF_QA__?.());
  mark("gate-120s-attack", (missionAtk?.mission?.attackCount ?? 0) >= 1 || missionAtk?.mission?.phase === "counter", {
    detail: { phase: missionAtk?.mission?.phase, attacks: missionAtk?.mission?.attackCount },
  });

  await page.waitForTimeout(2500);
  const defendBtn = page.locator('[data-testid="rf-defend-btn"]');
  if (await defendBtn.isEnabled().catch(() => false)) {
    await defendBtn.click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: join(SHOTS, "06-counter-attack.png") });

  const mission180 = await page.evaluate(() => window.__RF_QA__?.());
  const phase180 = mission180?.mission?.phase;
  mark("gate-180s-engagement", ["counter", "free"].includes(phase180) || (mission180?.mission?.attackCount ?? 0) >= 1, {
    detail: { phase: phase180, elapsed: Date.now() - t0 },
  });

  if (mission180?.me?.territoryPct >= 70 || (await page.locator('[data-testid="rf-rematch-btn"]').count()) > 0) {
    await page.screenshot({ path: join(SHOTS, "07-victory-or-defeat.png") });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "📍" }).click({ timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(SHOTS, "08-mobile.png") });
  const mobileMap = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="rf-game-shell"] canvas');
    if (!c) return { ok: false };
    const ctx = c.getContext("2d");
    if (!ctx) return { ok: false };
    const d = ctx.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data;
    const lum = d[0] + d[1] + d[2];
    const next = document.querySelector('[data-testid="rf-next-action"]')?.textContent ?? "";
    return { ok: lum > 30, lum, hasNext: next.includes("NEXT") };
  });
  mark("mobile-map-visible", mobileMap.ok, { detail: mobileMap });
  mark("mobile-next-action", mobileMap.hasNext, { note: "Next Action visible on mobile" });

  await browser.close();

  const pass = checks.filter((c) => c.ok).length;
  const fail = checks.filter((c) => !c.ok).length;
  const report = {
    base: BASE,
    commit: COMMIT,
    summary: { pass, fail, total: checks.length },
    checks,
    finishedAt: new Date().toISOString(),
  };
  writeFileSync(join(OUT, "verify-report.json"), JSON.stringify(report, null, 2));
  console.log(`\n=== Re:Front Fun Loop QA ${fail === 0 ? "PASS" : "FAIL"} ${pass}/${checks.length} ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
