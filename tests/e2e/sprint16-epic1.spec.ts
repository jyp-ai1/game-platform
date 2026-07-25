import { test, expect } from "@playwright/test";

test.describe("Sprint16 Epic1 — Identity Pivot routes", () => {
  test("home shows play-first visual hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Play" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Continue" })).toBeVisible();
  });

  test("journey page loads", async ({ page }) => {
    await page.goto("/journey");
    await expect(page.getByRole("heading", { name: /My Journey/i })).toBeVisible();
  });

  test("community page loads", async ({ page }) => {
    await page.goto("/community");
    await expect(page.getByRole("heading", { name: /Community/i })).toBeVisible();
  });

  test("mobile bottom nav has 5 items", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "주요 메뉴" });
    await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Discover" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Journey" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Community" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Profile" })).toBeVisible();
  });
});
