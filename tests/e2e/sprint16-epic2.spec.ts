import { test, expect } from "@playwright/test";

test.describe("Sprint16 Epic2 — Personal Journey", () => {
  test("journey page shows timeline and statistics", async ({ page }) => {
    await page.goto("/journey");
    await expect(page.getByRole("heading", { name: /My Journey/i })).toBeVisible();
    await expect(page.getByText(/Play History Timeline/i)).toBeVisible();
    await expect(page.getByText(/My Statistics/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "오늘" })).toBeVisible();
    await expect(page.getByRole("button", { name: "이번주" })).toBeVisible();
    await expect(page.getByRole("button", { name: "이번달" })).toBeVisible();
    await expect(page.getByRole("button", { name: "전체" })).toBeVisible();
  });
});
