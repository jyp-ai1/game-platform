import { test, expect } from "@playwright/test";
import path from "path";

import {
  attachPreviewAudit,
  assertPreviewAuditClean,
  collectUnhandledRejections,
  percentile,
} from "./helpers/preview-audit";
import {
  finalizeRc4Record,
  initRc4Record,
  patchRc4Record,
  setBrowser,
  setMobile,
} from "./helpers/rc4-results";
import { parseEntrySteps, readCrashLogFromPage } from "./helpers/recovery-artifacts";
import { expectGameReady } from "./helpers/golden-path";
import { resolveStressJoinCount } from "./helpers/stress-guard";

const PLAY_MS = Number(process.env.RC4_PLAY_MS ?? "180000");
const LIVING_MS = Number(process.env.RC4_LIVING_MS ?? "60000");
const STRESS = resolveStressJoinCount(process.env.RC4_STRESS_COUNT, "RC4 join-stress");
const STRESS_COUNT = STRESS.count;
const MOBILE_DIR = path.join(process.cwd(), "docs/qa/rc4-mobile");

function attachEntryCollector(page: import("@playwright/test").Page): string[] {
  const lines: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[ENTRY]")) lines.push(text);
  });
  return lines;
}

function parseJoinMs(lines: string[], wallMs?: number): number | null {
  const ready = lines.find((l) => l.includes("[ENTRY] GAME_READY PASS"));
  const ms = ready?.match(/(\d+)ms/)?.[1];
  if (ms && Number(ms) > 0) return Number(ms);
  const stepMs = ["CONNECT", "JOIN", "SPAWN", "GAME_READY"]
    .map((step) => {
      const line = lines.find((l) => l.includes(`[ENTRY] ${step} PASS`));
      return Number(line?.match(/(\d+)ms/)?.[1] ?? 0);
    })
    .reduce((a, b) => a + b, 0);
  if (stepMs > 0) return stepMs;
  return wallMs ?? null;
}

function assertRc4Telemetry(lines: string[]): void {
  const steps = parseEntrySteps(lines);
  const required = ["ENTRY", "JOIN", "CONNECT", "SPAWN", "GAME_READY", "REPLAY", "EXIT"];
  const missing = required.filter((s) => steps[s] !== "PASS");
  expect(missing, `telemetry missing: ${missing.join(", ")}`).toEqual([]);
}

async function idlePlay(page: import("@playwright/test").Page, durationMs: number): Promise<void> {
  const end = Date.now() + durationMs;
  const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
  let i = 0;
  while (Date.now() < end) {
    await page.keyboard.press(keys[i % keys.length]!);
    i++;
    await page.waitForTimeout(4000);
  }
}

async function joinWorld(page: import("@playwright/test").Page): Promise<{ lines: string[]; joinMs: number | null }> {
  const lines = attachEntryCollector(page);
  const t0 = Date.now();
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("play29:entry-crash-log"));
  await expect(page.getByTestId("home-hero-card")).toBeVisible({ timeout: 25_000 });
  await page.getByRole("button", { name: /바로 참가/ }).first().click();
  await page.waitForURL(/\/flagship\/snake-io\/play/, { timeout: 35_000 });
  expect(page.url()).toMatch(/room=WORLD/i);
  expect(page.url()).not.toMatch(/PRACTICE/i);
  await expectGameReady(page, 40_000);
  return { lines, joinMs: parseJoinMs(lines, Date.now() - t0) };
}

test.describe("RC4 Production Readiness", () => {
  test.beforeAll(() => {
    initRc4Record({
      previewUrl: process.env.QA_BASE_URL ?? "",
      gitSha: process.env.RC_GIT_SHA ?? "unknown",
      deploymentId: process.env.RC_DEPLOYMENT_ID,
    });
  });

  test.afterAll(() => {
    finalizeRc4Record();
  });

  test("P0-1 Browser JOIN PASS", async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    test.skip(project.startsWith("mobile-"), "desktop browsers only");

    let pass = false;
    try {
      await joinWorld(page);
      pass = true;
    } finally {
      setBrowser(project, pass ? "PASS" : "FAIL");
    }
  });

  test("P0-2 Mobile QA checklist", async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    test.skip(!project.startsWith("mobile-"), "mobile only");

    const audit = attachPreviewAudit(page);
    const shot = (name: string) =>
      page.screenshot({ path: path.join(MOBILE_DIR, `${project}-${name}.png`), fullPage: true });

    let pass = false;
    try {
      await page.goto("/");
      await expect(page.getByTestId("home-hero-card")).toBeVisible({ timeout: 25_000 });
      await shot("01-home");

      await page.getByRole("button", { name: /바로 참가/ }).first().click();
      await page.waitForURL(/\/flagship\/snake-io\/play/, { timeout: 35_000 });
      expect(page.url()).toMatch(/room=WORLD/i);
      await expectGameReady(page, 40_000);
      await shot("02-world");

      const canvas = page.locator(".touch-none").first();
      await expect(canvas).toBeVisible();
      const box = await canvas.boundingBox();
      if (box) {
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        await page.touchscreen.tap(cx, cy);
        await page.mouse.move(cx, cy);
        await page.mouse.down();
        await page.mouse.move(cx + 60, cy, { steps: 5 });
        await page.mouse.up();
      }
      await shot("03-touch");

      await expect(page.getByTestId("snake-end-result")).toBeVisible({ timeout: 20_000 });
      await page.getByTestId("snake-end-result").click();
      await expect(page.getByTestId("viral-loop-result")).toBeVisible({ timeout: 25_000 });
      await shot("04-replay");

      assertPreviewAuditClean(audit);
      pass = true;
    } finally {
      setMobile(project, pass ? "PASS" : "FAIL");
    }
  });

  test("P0-3 Golden Path — 3min play → death → Replay → Home", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "chromium only");
    test.setTimeout(PLAY_MS + 180_000);

    const audit = attachPreviewAudit(page);
    collectUnhandledRejections(page, audit.unhandledRejections);
    const entryLines = attachEntryCollector(page);
    const t0 = Date.now();
    let goldenPass = false;

    try {
      await page.goto("/");
      await page.evaluate(() => localStorage.removeItem("play29:entry-crash-log"));
      await expect(page.getByTestId("home-hero-card")).toBeVisible({ timeout: 25_000 });
      await page.getByRole("button", { name: /바로 참가/ }).first().click();
      await page.waitForURL(/\/flagship\/snake-io\/play/, { timeout: 35_000 });
      await expectGameReady(page, 40_000);
      await idlePlay(page, PLAY_MS);

      await expect(page.getByTestId("snake-end-result")).toBeVisible({ timeout: 15_000 });
      await page.getByTestId("snake-end-result").click();
      await expect(page.getByTestId("viral-loop-result")).toBeVisible({ timeout: 25_000 });

      await page.getByRole("button", { name: /홈으로/ }).click();
      await page.waitForURL("/", { timeout: 20_000 });
      await expect(page.getByTestId("home-skeleton")).not.toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId("home-hero-card")).toBeVisible({ timeout: 20_000 });

      assertRc4Telemetry(entryLines);
      expect(await readCrashLogFromPage(page)).toEqual([]);
      assertPreviewAuditClean(audit);
      goldenPass = true;
    } finally {
      patchRc4Record({
        goldenPath: goldenPass ? "PASS" : "FAIL",
        goldenPathDurationMs: Date.now() - t0,
        telemetry: goldenPass ? "PASS" : "FAIL",
        crash: goldenPass ? 0 : 1,
        console: goldenPass
          ? { errors: 0, hydration: 0, react: 0, unhandled: 0 }
          : {
              errors: audit.consoleErrors.length,
              hydration: audit.hydrationErrors.length,
              react: audit.reactErrors.length,
              unhandled: audit.unhandledRejections.length,
            },
      });
    }
  });

  test(`P0-4 Join stress ${STRESS_COUNT}x`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "chromium only");
    test.skip(!STRESS.enabled || STRESS_COUNT <= 0, "stress disabled — set MULTIPLAYER_STRESS_TEST=1");
    test.setTimeout(Math.max(900_000, STRESS_COUNT * 8000));

    const joinMs: number[] = [];
    let success = 0;

    for (let i = 0; i < STRESS_COUNT; i++) {
      try {
        const { joinMs: ms } = await joinWorld(page);
        if (ms != null) joinMs.push(ms);
        success++;
      } catch {
        /* count fail */
      }
      await page.goto("/");
      await page.waitForTimeout(300);
    }

    const successPct = Math.round((success / STRESS_COUNT) * 100);
    const averageMs =
      joinMs.length > 0 ? Math.round(joinMs.reduce((a, b) => a + b, 0) / joinMs.length) : 0;

    patchRc4Record({
      joinStress: {
        count: STRESS_COUNT,
        success,
        successPct,
        averageMs,
        p95Ms: percentile(joinMs, 95),
        maxMs: joinMs.length ? Math.max(...joinMs) : 0,
      },
    });

    expect(successPct, "join stress must be 100%").toBe(100);
  });

  test("P0-6 Living World — 60s idle observation", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "chromium only");
    test.setTimeout(LIVING_MS + 90_000);

    await joinWorld(page);
    const top10 = page.getByText("TOP10");
    await expect(top10).toBeVisible({ timeout: 15_000 });

    const beforeTop = await top10.locator("..").innerText();
    const beforeLive = await page.getByText(/LIVE · \d+/).innerText().catch(() => "");
    const beforeKill = await page.locator(".text-red-300").count();

    await page.waitForTimeout(LIVING_MS);

    const afterTop = await top10.locator("..").innerText();
    const afterLive = await page.getByText(/LIVE · \d+/).innerText().catch(() => "");
    const afterKill = await page.locator(".text-red-300").count();
    const canvasVisible = await page.locator(".touch-none").first().isVisible();
    const connectingGone = !(await page.getByText(/^Connecting/i).isVisible().catch(() => false));

    const alive =
      canvasVisible &&
      connectingGone &&
      (beforeTop !== afterTop ||
        beforeLive !== afterLive ||
        beforeKill !== afterKill ||
        afterKill > 0);

    patchRc4Record({ livingWorld: alive ? "PASS" : "FAIL" });
    expect(alive, "World Frozen").toBeTruthy();
  });
});
