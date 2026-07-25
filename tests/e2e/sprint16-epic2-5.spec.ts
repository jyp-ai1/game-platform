import { test, expect } from "@playwright/test";

test.describe("Sprint16 Epic2.5 — Home Polish", () => {
  test("home hero is compact with CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Play. Track. Challenge.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue Playing" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Discover Games" })).toBeVisible();
    await expect(page.getByText("▶ Continue Playing")).toBeVisible();
  });

  test("mobile first view shows hero and continue", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.getByText("Play. Track. Challenge.")).toBeInViewport();
    await expect(page.getByText("▶ Continue Playing")).toBeInViewport();
  });
});
