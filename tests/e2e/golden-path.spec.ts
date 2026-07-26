import { test, expect } from "@playwright/test";

import {
  assertRegressionRoutes,
  attachGoldenPathMonitors,
  expectGameReady,
  expectInputWorks,
} from "./helpers/golden-path";

test.describe("Golden Path — Stage 1 Entry", () => {
  test("Home shows LIVE Snake Quick Play", async ({ page }) => {
    const { consoleMon } = attachGoldenPathMonitors(page);
    await page.goto("/");
    await expect(page.getByRole("button", { name: /바로 참가/ }).first()).toBeVisible();
    await expect(page.getByText(/LIVE/i).first()).toBeVisible();
    consoleMon.assertClean();
  });

  test("Home → Quick Play → game ready + ENTRY chain", async ({ page }) => {
    const { consoleMon, entry } = attachGoldenPathMonitors(page);
    await page.goto("/");
    await page.getByRole("button", { name: /바로 참가/ }).first().click();
    await page.waitForURL(/\/flagship\/snake-io\/play/, { timeout: 20_000 });
    await expectGameReady(page);
    entry.assertSteps([
      "CLICK",
      "ROUTE",
      "PLAY_MOUNTED",
      "PROVIDER_READY",
      "ENGINE_READY",
      "CONNECTING",
    ]);
    await expectInputWorks(page);
    const steps = entry.getSteps().join("\n");
    expect(steps.includes("INPUT") || steps.includes("GAME_READY")).toBeTruthy();
    consoleMon.assertClean();
  });

  test("Practice mode loads without error page", async ({ page }) => {
    const { consoleMon, entry } = attachGoldenPathMonitors(page);
    await page.goto("/flagship/snake-io/play?room=PRACTICE");
    await expectGameReady(page);
    entry.assertSteps(["PLAY_MOUNTED", "PROVIDER_READY", "ENGINE_READY", "CONNECTED"]);
    await expectInputWorks(page);
    consoleMon.assertClean();
  });

  test("Missing room param → Practice fallback (no error page)", async ({ page }) => {
    const { consoleMon } = attachGoldenPathMonitors(page);
    await page.goto("/flagship/snake-io/play");
    await page.waitForURL(/room=PRACTICE/, { timeout: 15_000 });
    await expect(page.getByText(/문제가 발생|Error|404/i)).not.toBeVisible();
    await expectGameReady(page);
    consoleMon.assertClean();
  });

  test("WORLD join or Practice fallback — never stuck on error", async ({ page }) => {
    const { consoleMon } = attachGoldenPathMonitors(page);
    await page.goto("/flagship/snake-io/play?room=WORLD");
    await page.waitForURL(/room=(WORLD|PRACTICE)/, { timeout: 30_000 });
    await expect(page.getByText(/문제가 발생|Application error/i)).not.toBeVisible();
    await expectGameReady(page, 30_000);
    consoleMon.assertClean();
  });
});

test.describe("Golden Path — Regression", () => {
  test("Home · Games · Community · Passport load clean", async ({ page }) => {
    const { consoleMon } = attachGoldenPathMonitors(page);
    await assertRegressionRoutes(page);
    consoleMon.assertClean();
  });
});
