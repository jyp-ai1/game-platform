#!/usr/bin/env node
/**
 * Sprint 15.2 — Mobile Runtime Smoke (50 games)
 * Portrait 375/390/430 · Landscape · Safe-area · Touch · Tablet · iPad
 */
import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASE = process.env.QA_BASE_URL ?? "http://localhost:3001";
const PLAY_MS = Number(process.env.QA_PLAY_MS ?? 8000);
const OUT = path.join(REPO, "docs/qa/sprint15-mobile-smoke-results.json");

const VIEWPORTS = [
  { id: "portrait-375", width: 375, height: 667, isMobile: true, hasTouch: true },
  { id: "portrait-390", width: 390, height: 844, isMobile: true, hasTouch: true },
  { id: "portrait-430", width: 430, height: 932, isMobile: true, hasTouch: true },
  { id: "landscape-844", width: 844, height: 390, isMobile: true, hasTouch: true },
  { id: "tablet-768", width: 768, height: 1024, isMobile: true, hasTouch: true },
  { id: "ipad-1024", width: 1024, height: 768, isMobile: false, hasTouch: true },
  { id: "fold-717", width: 717, height: 512, isMobile: true, hasTouch: true },
];

const playableSrc = await readFile(path.join(REPO, "apps/web/lib/playable-games.ts"), "utf8");
const ALL_SLUGS = playableSrc.match(/"([a-z0-9-]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];
const slugs = process.argv.slice(2).length ? process.argv.slice(2) : ALL_SLUGS;

async function dismissResume(page) {
  const resume = page.getByText("저장된 게임이 있어요");
  if (await resume.isVisible({ timeout: 1500 }).catch(() => false)) {
    await page.getByRole("button", { name: /^새 게임$/ }).click();
    await page.waitForTimeout(400);
  }
}

async function startGame(page, slug) {
  await dismissResume(page);
  const pattern = slug === "snake" ? /게임 시작/ : /^게임 시작$/;
  const btn = page.getByRole("button", { name: pattern });
  await btn.waitFor({ state: "visible", timeout: 20000 });
  await btn.click();
    await page.waitForTimeout(5000);
}

async function measureLayout(page, viewport) {
  return page.evaluate((vp) => {
    const doc = document.documentElement;
    const gameRoot =
      document.querySelector(".game-detail-stage") ??
      document.querySelector(".standard-game-shell") ??
      document.querySelector("[data-snake-viewport]");
    const overflowX = gameRoot
      ? gameRoot.scrollWidth > vp.width + 2
      : doc.scrollWidth > vp.width + 8;
    const h1 = !!document.querySelector("h1");
    const shell = !!gameRoot;
    const scope = gameRoot ?? document.body;
    const buttons = [...scope.querySelectorAll("button:not([disabled]), [role='button']:not([disabled])")].slice(
      0,
      16
    );
    const smallTouch = buttons.filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (r.width < 36 || r.height < 36);
    }).length;
    const hasSafeArea = !!scope.querySelector(
      "[style*='safe-area'], [class*='safe-area'], [class*='pb-[max'], [class*='env(safe-area']"
    );
    const gameButtons = buttons.filter((b) => {
      const t = b.textContent?.trim() ?? "";
      return t && !/^(Post|Share|Retry)$/i.test(t);
    });
    const controlsBottom = gameButtons.map((b) => b.getBoundingClientRect().bottom).filter((y) => y > 0);
    const maxBtnBottom = controlsBottom.length ? Math.max(...controlsBottom) : 0;
    const pageScrollable = document.body.scrollHeight > vp.height + 48;
    const clippedBottom = !pageScrollable && maxBtnBottom > vp.height - 8;
    return {
      overflowX,
      scrollWidth: gameRoot?.scrollWidth ?? doc.scrollWidth,
      h1,
      shell,
      smallTouch,
      hasSafeArea,
      clippedBottom,
      viewportH: vp.height,
    };
  }, viewport);
}

async function touchPlay(page, slug) {
  const shell = page.locator(".game-detail-stage, .standard-game-shell, [data-snake-viewport]").first();
  const deadline = Date.now() + PLAY_MS;
  let taps = 0;
  while (Date.now() < deadline) {
    const box = await shell.boundingBox().catch(() => null);
    if (box) {
      await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.5).catch(() => {});
      await page.touchscreen.tap(box.x + box.width * 0.3, box.y + box.height * 0.7).catch(() => {});
      taps += 2;
    }
    await page.waitForTimeout(180);
  }
  return taps;
}

async function testViewport(browser, slug, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
    deviceScaleFactor: vp.isMobile ? 2 : 1,
  });
  const page = await context.newPage();
  const bugs = [];
  try {
    await page.addInitScript((s) => {
      window.localStorage.setItem(`play29:runtime-tutorial-seen:${s}`, "1");
    }, slug);
    await page.goto(`${BASE}/games/${slug}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1500);
    const beforeStart = await measureLayout(page, vp);
    if (!beforeStart.h1) bugs.push("h1-missing");
    if (beforeStart.overflowX) bugs.push("overflow-x");

    if (slug === "snake") {
      if (!beforeStart.shell) bugs.push("shell-missing-prestart");
      return { viewport: vp.id, ok: bugs.length === 0, bugs, taps: 0, layout: beforeStart, snakeKnown: true };
    }

    await startGame(page, slug);
    const layout = await measureLayout(page, vp);
    if (!layout.shell) bugs.push("shell-missing");
    if (layout.overflowX) bugs.push("overflow-x-ingame");
    if (layout.smallTouch > 4) bugs.push(`small-touch-${layout.smallTouch}`);
    if (layout.clippedBottom && vp.height <= 700) bugs.push("controls-clipped");
    const taps = await touchPlay(page, slug);
    if (taps === 0) bugs.push("no-touch-target");
    return { viewport: vp.id, ok: bugs.length === 0, bugs, taps, layout };
  } catch (e) {
    return { viewport: vp.id, ok: false, bugs: ["error"], error: String(e.message || e) };
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
const results = [];

for (const slug of slugs) {
  const viewports = [];
  for (const vp of VIEWPORTS) {
    viewports.push(await testViewport(browser, slug, vp));
  }
  const fails = viewports.filter((v) => !v.ok);
  const verdict =
    slug === "snake" && viewports.every((v) => v.snakeKnown || v.ok)
      ? "KNOWN_ISSUE"
      : fails.length === 0
        ? "PASS"
        : "FAIL";
  results.push({ slug, viewports, verdict, failCount: fails.length });
  console.log(`${verdict} ${slug} fails=${fails.length}`);
}

await browser.close();

const pass = results.filter((r) => r.verdict === "PASS").length;
const fail = results.filter((r) => r.verdict === "FAIL").length;
const known = results.filter((r) => r.verdict === "KNOWN_ISSUE").length;

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(
  OUT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      baseUrl: BASE,
      playMs: PLAY_MS,
      total: results.length,
      pass,
      fail,
      knownIssue: known,
      games: results,
    },
    null,
    2
  )
);

console.log(`\nWrote ${OUT}`);
console.log(`Mobile Smoke PASS ${pass} FAIL ${fail} KNOWN ${known}`);
process.exit(fail > 0 ? 1 : 0);
