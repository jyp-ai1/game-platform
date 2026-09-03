/**
 * Territory War movement probe — FIX2 gate (keyboard + steer pipeline).
 */
import { chromium } from "playwright";
import { BASE, createDualPages, invitePath } from "./lib/mp-common.mjs";

async function readQa(page) {
  return page.evaluate(() => window.__TW_QA__?.() ?? null);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const { pageA, close } = await createDualPages(browser, "tw-probe-a", "tw-probe-b");
  const url = `${BASE}${invitePath("territory-war", "TW-PROBE", "mp_qa_local=1")}`;

  try {
    await pageA.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    await pageA.waitForSelector('[data-testid="mp-enter-world"], [data-testid="mp-you-bar"]', {
      timeout: 120_000,
    });
    if ((await pageA.locator('[data-testid="mp-enter-world"]').count()) > 0) {
      await pageA.locator('[data-testid="mp-enter-world"]').click();
    }
    await pageA.waitForFunction(() => typeof window.__TW_QA__ === "function", { timeout: 30_000 });
    await pageA.locator("[data-mp-play-board]").click();

    const before = await readQa(pageA);
    const me0 = before?.players.find((p) => p.id === before.deviceId);

    await pageA.keyboard.down("KeyW");
    await pageA.waitForTimeout(600);
    await pageA.keyboard.up("KeyW");

    const afterW = await readQa(pageA);
    const meW = afterW?.players.find((p) => p.id === afterW.deviceId);

    await pageA.locator("[data-mp-play-board]").click();
    await pageA.keyboard.down("KeyD");
    await pageA.keyboard.down("KeyW");
    await pageA.waitForTimeout(600);
    await pageA.keyboard.up("KeyD");
    await pageA.keyboard.up("KeyW");

    const afterDiag = await readQa(pageA);
    const meD = afterDiag?.players.find((p) => p.id === afterDiag.deviceId);

    const boardInactive = await pageA.evaluate(() => {
      const exit = document.querySelector('[data-mp-fs-shell] button');
      exit?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      exit?.click();
      return document.querySelector('[data-mp-play-board][data-mp-board-input="active"]') == null;
    });
    const posBeforeOutside = meD?.y ?? 0;
    await pageA.keyboard.press("ArrowDown");
    await pageA.waitForTimeout(300);
    const afterOutsideKey = await readQa(pageA);
    const meOutside = afterOutsideKey?.players.find((p) => p.id === afterOutsideKey.deviceId);

    const moveW = me0 && meW ? Math.hypot(meW.x - me0.x, meW.y - me0.y) : 0;
    const moveDiag = meW && meD ? Math.hypot(meD.x - meW.x, meD.y - meW.y) : 0;
    const blockedOutside =
      meOutside && Math.hypot(meOutside.x - posBeforeOutside, meOutside.y - meD.y) < 2;

    const pass = moveW > 8 && moveDiag > 8 && boardInactive && blockedOutside;

    console.log(JSON.stringify({
      pass,
      moveW,
      moveDiag,
      boardInactive,
      blockedOutside,
      me0,
      meW,
      meD,
      isHost: afterDiag?.isHost,
    }, null, 2));

    process.exit(pass ? 0 : 1);
  } finally {
    await close();
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
