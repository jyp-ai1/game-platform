import { test, expect } from "@playwright/test";

test.describe("Sprint16 Epic2.5 — Home Polish (superseded by Epic3)", () => {
  test("home hero CTAs remain compact", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Play" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Discover" })).toBeVisible();
  });

  test("mobile first view shows hero and continue", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Play" })).toBeInViewport();
    await expect(page.getByRole("heading", { name: "Continue" })).toBeInViewport();
  });
});
