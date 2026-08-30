/**
 * Shared MP QA utilities for CPO 2nd-pass harness.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { devices } from "playwright";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
export const BASE = process.env.QA_BASE_URL ?? "https://game29.vercel.app";
export const COMMIT = process.env.QA_COMMIT ?? "local";
export const OUT = join(ROOT, "docs/qa/cpo/mp-cto-cpo-qa-010");
export const SHOTS = join(OUT, "screenshots");

mkdirSync(SHOTS, { recursive: true });

export function createReportState() {
  const checks = [];
  const verifyReport = {
    base: BASE,
    commit: COMMIT,
    startedAt: new Date().toISOString(),
    gates: {},
    checks: [],
  };

  function mark(name, ok, detail = {}) {
    const row = { name, ok, ...detail, t: new Date().toISOString() };
    checks.push(row);
    verifyReport.checks.push(row);
    console.log(`${ok ? "PASS" : "FAIL"} ${name}`, detail.detail ?? detail.note ?? "");
    return ok;
  }

  return { checks, verifyReport, mark };
}

export function invitePath(slug, room, extra = "", playPath) {
  const q = extra ? `&${extra.replace(/^&/, "")}` : "";
  const base = playPath ?? `/games/${slug}/play`;
  return `${base}?room=${encodeURIComponent(room)}${q}`;
}

export async function enterGame(page, slug, opts = { strictReady: false }) {
  const enter = page.locator('[data-testid="mp-enter-world"]');
  await enter.or(page.getByRole("button", { name: /^ENTER$/i })).first().waitFor({
    state: "visible",
    timeout: 45_000,
  });
  if ((await enter.count()) > 0) {
    await enter.click({ timeout: 15_000 });
  } else {
    await page.getByRole("button", { name: /^ENTER$/i }).first().click({ timeout: 15_000 });
  }

  if (slug === "bomber") {
    await page.waitForTimeout(800);
    const connecting = page.locator('[data-testid="bomber-connecting"]');
    if ((await connecting.count()) > 0) {
      await connecting.waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
    }
    const hud = page.locator('[data-testid="bomber-match-hud"]');
    if ((await hud.count()) === 0) {
      const url = page.url();
      const m = url.match(/room=BOMBER-([A-D])/i);
      const letter = m?.[1]?.toUpperCase();
      const onMapSelect = (await page.locator('[data-testid="bomber-map-select"]').count()) > 0;
      if (letter && onMapSelect) {
        const mapBtn = page.locator(`[data-testid="bomber-map-${letter}"]`);
        if ((await mapBtn.count()) > 0) {
          await mapBtn.click({ timeout: 8_000, force: true }).catch(() => {});
        }
      }
    }
    await hud.waitFor({ timeout: 45_000 }).catch(() => {});
    const readyWait = page
      .locator('[data-testid="bomber-input-ready"][data-ready="1"]')
      .waitFor({ timeout: opts.strictReady ? 45_000 : 30_000 });
    if (opts.strictReady) {
      await readyWait;
    } else {
      await readyWait.catch(() => {});
    }
  }

  if (slug === "snake") {
    const right = page.locator('[data-testid="mp-pad-right"]');
    await right.waitFor({ state: "visible", timeout: 25_000 }).catch(() => {});
    if ((await right.count()) > 0) {
      await right.click({ timeout: 5_000 }).catch(() => {});
    }
  }

  if (slug === "agar") {
    await page.waitForTimeout(1500);
    const death = page.locator('[data-testid="mp-death-overlay"]');
    if ((await death.count()) > 0 && (await death.isVisible())) {
      await page.locator('[data-testid="mp-death-retry"]').click({ timeout: 8_000 }).catch(() => {});
      await page.waitForTimeout(1200);
    }
  }

  await page.waitForTimeout(1200);
}

export async function newContextWithDevice(browser, deviceId) {
  const ctx = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
    hasTouch: true,
  });
  await ctx.addInitScript((id) => {
    window.localStorage.setItem("play29:device-id", id);
  }, deviceId);
  return ctx;
}

export async function dragFloatingPad(page, dir = "right") {
  const overlay = page.locator('[data-testid="mp-mobile-control-pad"]');
  if ((await overlay.count()) === 0) return false;
  const vp = page.viewportSize() ?? { width: 390, height: 844 };
  const cx = Math.floor(vp.width * 0.25);
  const cy = Math.floor(vp.height * 0.55);
  const dx = dir === "right" ? 55 : dir === "left" ? -55 : 0;
  const dy = dir === "down" ? 55 : dir === "up" ? -55 : 0;
  await overlay.dispatchEvent("pointerdown", {
    pointerId: 7,
    clientX: cx,
    clientY: cy,
    pointerType: "touch",
    bubbles: true,
  });
  await overlay.dispatchEvent("pointermove", {
    pointerId: 7,
    clientX: cx + dx,
    clientY: cy + dy,
    pointerType: "touch",
    bubbles: true,
  });
  await page.waitForTimeout(900);
  await overlay.dispatchEvent("pointerup", {
    pointerId: 7,
    clientX: cx + dx,
    clientY: cy + dy,
    pointerType: "touch",
    bubbles: true,
  });
  return true;
}

export async function readBomberGrid(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="bomber-local-player"]');
    if (!el) return null;
    return {
      x: Number(el.getAttribute("data-grid-x")),
      y: Number(el.getAttribute("data-grid-y")),
    };
  });
}

export async function readBomberPlayer(page, playerId) {
  return page.evaluate((id) => {
    const el = document.querySelector(`[data-player-id="${id}"]`);
    if (!el) return null;
    return {
      x: Number(el.getAttribute("data-grid-x")),
      y: Number(el.getAttribute("data-grid-y")),
    };
  }, playerId);
}

export async function moveBomber(page, dir = "right", steps = 5) {
  const delta = {
    right: [1, 0],
    left: [-1, 0],
    down: [0, 1],
    up: [0, -1],
  }[dir] ?? [1, 0];
  for (let i = 0; i < steps; i++) {
    const qaMoved = await page
      .evaluate(
        ([dx, dy]) => {
          if (typeof window.__BOMBER_QA_MOVE__ !== "function") return false;
          window.__BOMBER_QA_MOVE__(dx, dy);
          return true;
        },
        delta
      )
      .catch(() => false);
    if (!qaMoved) {
      await dragFloatingPad(page, dir);
      const key =
        dir === "right" ? "ArrowRight" : dir === "left" ? "ArrowLeft" : dir === "down" ? "ArrowDown" : "ArrowUp";
      await page.keyboard.press(key).catch(() => {});
    }
    await page.waitForTimeout(350);
  }
}

export { devices };
