/**
 * Mobile Dynamic Floating Pad contract — left half = pad, right = action.
 */
import { join } from "node:path";
import { BASE, SHOTS, devices, enterGame, invitePath } from "./lib/mp-common.mjs";

export async function probeFloatingMobile(page, slug, mark) {
  const iphone = devices["iPhone 13"];
  await page.setViewportSize(iphone.viewport);
  const room = slug === "bomber" ? "BOMBER-A" : "WORLD-QA010";
  const extra = slug === "agar" ? "mp_qa_pad=1" : slug === "bomber" ? "mp_qa_local=1" : "";
  const playPath = slug === "snake" ? "/flagship/snake-io/play" : undefined;
  await page.goto(`${BASE}${invitePath(slug, room, extra, playPath)}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  if (slug === "snake") {
    await page.waitForURL(/snake-io\/play/, { timeout: 45_000 }).catch(() => {});
  }
  await enterGame(page, slug);

  const overlay = page.locator('[data-testid="mp-mobile-control-pad"]');
  mark(`${slug}-mobile-overlay`, (await overlay.count()) > 0);

  const joyBefore = await page.locator('[data-testid="mp-floating-joystick"]').count();
  mark(`${slug}-floating-joystick-hidden-initial`, joyBefore === 0);

  const vp = page.viewportSize() ?? { width: 390, height: 844 };
  const cx = Math.floor(vp.width * 0.25);
  const cy = Math.floor(vp.height * 0.55);
  await overlay.dispatchEvent("pointerdown", {
    pointerId: 3,
    clientX: cx,
    clientY: cy,
    pointerType: "touch",
    bubbles: true,
  });
  await overlay.dispatchEvent("pointermove", {
    pointerId: 3,
    clientX: cx + 55,
    clientY: cy,
    pointerType: "touch",
    bubbles: true,
  });
  await page.waitForTimeout(250);
  mark(`${slug}-floating-joystick-on-touch`, (await page.locator('[data-testid="mp-floating-joystick"]').count()) > 0);

  const actionIds =
    slug === "snake" ? ["boost"] : slug === "agar" ? ["split", "eject"] : ["bomb"];
  for (const id of actionIds) {
    const btn = page.locator(`[data-testid="mp-pad-action-${id}"]`);
    mark(`${slug}-mobile-action-zone-${id}`, (await overlay.count()) > 0 && (await btn.count()) > 0);
  }

  await page.screenshot({ path: join(SHOTS, `${slug}-mobile-pad.png`), fullPage: true });
}

export async function runMobileRegression(browser, mark) {
  const ctx = await browser.newContext({ hasTouch: true });
  try {
    for (const slug of ["snake", "agar", "bomber"]) {
      const p = await ctx.newPage();
      try {
        await probeFloatingMobile(p, slug, mark);
      } finally {
        await p.close();
      }
    }
  } finally {
    await ctx.close();
  }
}
