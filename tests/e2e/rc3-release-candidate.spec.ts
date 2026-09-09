import { test, expect } from "@playwright/test";

import { attachConsoleMonitor } from "./helpers/console-monitor";
import {
  attachGoldenPathMonitors,
  expectGameReady,
  expectInputWorks,
} from "./helpers/golden-path";
import {
  assertWorldJoin,
  parseEntrySteps,
  readCrashLogFromPage,
  writeCrashLogJson,
  writeEntryLogMd,
} from "./helpers/recovery-artifacts";
import { resolveStressJoinCount } from "./helpers/stress-guard";

const STRESS = resolveStressJoinCount(process.env.RC_STRESS_COUNT, "RC3 join-stress");
const STRESS_COUNT = STRESS.count;
const ARTIFACTS = process.env.RC3_ARTIFACTS === "1";

function attachEntryCollector(page: import("@playwright/test").Page): string[] {
  const lines: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[ENTRY]")) lines.push(text);
  });
  return lines;
}

async function quickPlayWorld(page: import("@playwright/test").Page): Promise<string[]> {
  const lines = attachEntryCollector(page);
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("play29:entry-crash-log"));
  await page.getByRole("button", { name: /바로 참가/ }).first().click();
  await page.waitForURL(/\/flagship\/snake-io\/play/, { timeout: 30_000 });
  expect(page.url()).toMatch(/room=WORLD/i);
  expect(page.url()).not.toMatch(/room=PRACTICE/i);
  await expectGameReady(page, 35_000);
  return lines;
}

test.describe("RC3 Release Candidate Gate", () => {
  test("Golden Path + Entry Chain + Console/Crash Zero", async ({ page }) => {
    test.setTimeout(120_000);
    const { consoleMon } = attachGoldenPathMonitors(page);
    const entryLines = attachEntryCollector(page);

    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("play29:entry-crash-log"));
    await page.getByRole("button", { name: /바로 참가/ }).first().click();
    await page.waitForURL(/\/flagship\/snake-io\/play/, { timeout: 30_000 });

    expect(page.url()).toMatch(/room=WORLD/i);
    expect(page.url()).not.toMatch(/PRACTICE/);

    await expectGameReady(page, 35_000);
    await expectInputWorks(page);

    const steps = parseEntrySteps(entryLines);
    assertWorldJoin(steps);

    const crashes = await readCrashLogFromPage(page);
    expect(crashes).toEqual([]);

    if (ARTIFACTS) {
      writeEntryLogMd(entryLines, { url: page.url(), recordedAt: new Date().toISOString() });
      writeCrashLogJson(crashes);
    }

    consoleMon.assertClean();
  });

  test("WORLD success must not redirect to Practice", async ({ page }) => {
    test.setTimeout(90_000);
    const { consoleMon } = attachGoldenPathMonitors(page);
    await quickPlayWorld(page);
    expect(page.url()).not.toContain("PRACTICE");
    consoleMon.assertClean();
  });

  test(`Join stress ${STRESS_COUNT}x`, async ({ page }) => {
    test.skip(!STRESS.enabled || STRESS_COUNT <= 0, "stress disabled — set MULTIPLAYER_STRESS_TEST=1");
    test.setTimeout(Math.max(600_000, STRESS_COUNT * 8000));
    const { consoleMon } = attachGoldenPathMonitors(page);
    let success = 0;

    for (let i = 0; i < STRESS_COUNT; i++) {
      await page.goto("/");
      await page.evaluate(() => localStorage.removeItem("play29:entry-crash-log"));
      await page.getByRole("button", { name: /바로 참가/ }).first().click();
      await page.waitForURL(/\/flagship\/snake-io\/play/, { timeout: 30_000 });
      if (page.url().includes("PRACTICE")) continue;
      try {
        await expectGameReady(page, 25_000);
        success++;
      } catch {
        /* count fail */
      }
    }

    expect(success).toBe(STRESS_COUNT);
    consoleMon.assertClean();
  });

  test("Offline → Online reconnect", async ({ page, context }) => {
    test.setTimeout(120_000);
    const { consoleMon } = attachGoldenPathMonitors(page);
    await quickPlayWorld(page);
    await context.setOffline(true);
    await page.waitForTimeout(1500);
    await context.setOffline(false);
    await page.waitForTimeout(1500);
    await expectGameReady(page, 20_000);
    await expectInputWorks(page);
    const crashes = await readCrashLogFromPage(page);
    expect(crashes).toEqual([]);
    consoleMon.assertClean();
  });
});
