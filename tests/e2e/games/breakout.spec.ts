import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Breakout", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "breakout");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "breakout");
  });
});
