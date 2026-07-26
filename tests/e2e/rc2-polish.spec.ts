import { test, expect } from "@playwright/test";

import { attachConsoleMonitor } from "./helpers/console-monitor";
import { attachGoldenPathMonitors, expectGameReady } from "./helpers/golden-path";

test.describe("RC2 Polish — Empty States", () => {
  test("home empty sections show copy not blank boxes", async ({ page }) => {
    const { consoleMon } = attachGoldenPathMonitors(page);
    await page.goto("/");
    await expect(page.getByTestId("home-hero-card")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByTestId("home-continue")).toBeVisible();
    const continueRow = page.getByTestId("home-continue-row");
    const continueEmpty = page.getByTestId("home-continue-empty");
    if (await continueRow.count()) {
      await expect(continueRow.first()).toBeVisible();
    } else {
      await expect(continueEmpty).toHaveText(/최근 플레이가 없습니다/);
    }

    const notificationEmpty = page.getByTestId("notification-empty");
    const missionEmpty = page.getByTestId("mission-empty");
    if (await notificationEmpty.count()) {
      await expect(notificationEmpty).toHaveText(/새로운 알림이 없습니다/);
    }
    if (await missionEmpty.count()) {
      await expect(missionEmpty).toHaveText(/오늘의 미션을 모두 완료했습니다/);
    }

    const friendEmpty = page.getByTestId("friend-empty");
    const heroFriendEmpty = page.getByTestId("hero-friend-empty");
    if (await friendEmpty.count()) {
      await expect(friendEmpty).toHaveText(/플레이 중인 친구가 없습니다/);
    } else if (await heroFriendEmpty.count()) {
      await expect(heroFriendEmpty).toHaveText(/플레이 중인 친구가 없습니다/);
    }

    consoleMon.assertClean();
  });
});

test.describe("RC2 Polish — Resilience", () => {
  test("offline home keeps rendered hero", async ({ page, context }) => {
    const { consoleMon } = attachGoldenPathMonitors(page);
    await page.goto("/");
    await expect(page.getByTestId("home-hero-card")).toBeVisible({ timeout: 15_000 });
    await context.setOffline(true);
    await expect(page.getByTestId("home-hero-card")).toBeVisible();
    await expect(page.getByRole("button", { name: /바로 참가/ }).first()).toBeVisible();
    consoleMon.assertClean();
  });

  test("slow network play still reaches ready or practice", async ({ page, context }) => {
    await context.route("**/*", async (route) => {
      await new Promise((r) => setTimeout(r, 120));
      await route.continue();
    });
    const { consoleMon } = attachGoldenPathMonitors(page);
    await page.goto("/flagship/snake-io/play?room=WORLD");
    await page.waitForURL(/room=(WORLD|PRACTICE)/, { timeout: 45_000 });
    await expectGameReady(page, 45_000);
    consoleMon.assertClean();
  });

  test("practice fallback URL shows game", async ({ page }) => {
    const { consoleMon } = attachGoldenPathMonitors(page);
    await page.goto("/flagship/snake-io/play?room=PRACTICE&fallback=1");
    await expectGameReady(page);
    consoleMon.assertClean();
  });
});

test.describe("RC2 Polish — Viewports", () => {
  test("mobile safari class viewport home", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { consoleMon } = attachGoldenPathMonitors(page);
    await page.goto("/");
    await expect(page.getByTestId("home-hero-card")).toBeVisible({ timeout: 15_000 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    );
    expect(overflow).toBe(false);
    consoleMon.assertClean();
  });
});
