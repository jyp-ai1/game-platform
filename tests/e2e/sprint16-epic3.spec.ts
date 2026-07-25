import { test, expect } from "@playwright/test";

test.describe("Sprint16 Epic3 — Home Experience 3.0", () => {
  test("visual hero with play CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Play" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Discover" })).toBeVisible();
    await expect(page.getByText("Challenge")).toBeVisible();
  });

  test("continue and daily challenge on home", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Continue" })).toBeVisible();
    await expect(page.getByText("Daily Challenge")).toBeVisible();
  });

  test("for you recommendations section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Recommended" })).toBeVisible();
  });
});
