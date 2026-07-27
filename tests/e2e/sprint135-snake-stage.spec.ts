import { expect, test } from "@playwright/test";

/** Sprint 13.5 — Stage mode smoke (HUD + overlays). Full play QA is PM device. */
test.describe("Sprint 13.5 Snake Stage", () => {
  test("STAGE room loads Stage 1 HUD", async ({ page }) => {
    await page.goto("/flagship/snake-io/play?room=STAGE");
    await page.getByRole("button", { name: /시작|Start|확인/i }).click({ timeout: 15_000 }).catch(() => {});
    await expect(page.getByText("Stage 1")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Goal/i)).toBeVisible();
    await expect(page.getByText(/Speed/i)).toBeVisible();
  });
});
