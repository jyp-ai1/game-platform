import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Basketball", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "basketball");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "basketball");
  });
});
