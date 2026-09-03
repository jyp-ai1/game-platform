/**
 * P0 Browser Play Verification — Territory War
 * PASS requires visible canvas change + keyboard scope + exit.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { BASE, COMMIT, invitePath } from "./lib/mp-common.mjs";

const OUT = join(process.cwd(), "docs/qa/cpo/territory-war-g12r");
mkdirSync(OUT, { recursive: true });
const SHOTS = join(OUT, "p0-browser-play");
mkdirSync(SHOTS, { recursive: true });

function bufDiff(a, b) {
  if (!a || !b || a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
  return false;
}

async function enterGame(page) {
  const room = process.env.QA_ROOM ?? `TW-P0-${Date.now()}`;
  const url = `${BASE}${invitePath("territory-war", room, "mp_qa_local=1")}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector('button:has-text("EXPAND")', { timeout: 60_000 });
  await page.locator('button:has-text("EXPAND")').click();
  await page.waitForSelector("[data-mp-play-board]", { timeout: 30_000 });
  await page.locator("[data-mp-play-board]").click();
  await page.waitForTimeout(600);
}

async function canvasShot(page) {
  const canvas = page.locator("canvas").first();
  return canvas.screenshot();
}

async function holdKey(page, code, ms) {
  await page.keyboard.down(code);
  await page.waitForTimeout(ms);
  await page.keyboard.up(code);
}

async function main() {
  const report = {
    sprint: "P0-BROWSER-PLAY",
    base: BASE,
    commit: COMMIT,
    finishedAt: null,
    movement: false,
    wasd: false,
    arrowKeys: false,
    keyboardScope: false,
    exit: false,
    pass: false,
  };

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
  const page = await ctx.newPage();

  try {
    await enterGame(page);
    const before = await canvasShot(page);

    await holdKey(page, "KeyW", 900);
    await page.waitForTimeout(400);
    const afterW = await canvasShot(page);
    report.movement = bufDiff(before, afterW);

    await page.locator("[data-mp-play-board]").click();
    await holdKey(page, "KeyA", 500);
    const afterA = await canvasShot(page);
    await holdKey(page, "KeyD", 500);
    const afterD = await canvasShot(page);
    await holdKey(page, "KeyS", 500);
    const afterS = await canvasShot(page);
    report.wasd =
      bufDiff(afterW, afterA) && bufDiff(afterA, afterD) && bufDiff(afterD, afterS);

    await page.locator("[data-mp-play-board]").click();
    await holdKey(page, "ArrowUp", 500);
    const afterUp = await canvasShot(page);
    await holdKey(page, "ArrowLeft", 500);
    const afterLeft = await canvasShot(page);
    report.arrowKeys = bufDiff(afterS, afterUp) || bufDiff(afterUp, afterLeft);

    await page.screenshot({ path: join(SHOTS, "after-move.png") });

    await page.evaluate(() => {
      document.body.style.minHeight = "3000px";
      window.scrollTo(0, 0);
    });
    await page.locator('[data-testid="mp-top10"]').click();
    await page.waitForTimeout(300);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    const boardInactive = await page.evaluate(
      () => document.querySelector('[data-mp-play-board][data-mp-board-input="active"]') == null
    );
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(120);
    }
    const scrollAfter = await page.evaluate(() => window.scrollY);
    report.keyboardScope = boardInactive && scrollAfter > scrollBefore + 20;

    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((b) =>
        (b.textContent ?? "").trim().startsWith("나가")
      );
      btn?.click();
    });
    await page.waitForTimeout(1200);
    const exited = !page.url().includes("/play");
    const activeAfterExit = await page.evaluate(
      () => document.querySelector('[data-mp-play-board][data-mp-board-input="active"]') != null
    );
    let keysDead = true;
    if (!exited) {
      await page.keyboard.press("ArrowUp");
      keysDead = false;
    } else {
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(200);
      keysDead = !activeAfterExit;
    }
    report.exit = exited && keysDead;

    report.pass =
      report.movement &&
      report.wasd &&
      report.arrowKeys &&
      report.keyboardScope &&
      report.exit;

    report.finishedAt = new Date().toISOString();
    writeFileSync(join(OUT, "p0-browser-play-report.json"), JSON.stringify(report, null, 2));

    console.log("Movement", report.movement);
    console.log("WASD", report.wasd);
    console.log("Arrow Keys", report.arrowKeys);
    console.log("Keyboard Scope", report.keyboardScope);
    console.log("Exit", report.exit);
    console.log("\n=== P0 BROWSER PLAY ===", report.pass ? "PASS" : "FAIL");
    process.exit(report.pass ? 0 : 1);
  } finally {
    await ctx.close();
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
