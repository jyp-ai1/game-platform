import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Penalty Shootout", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "penalty-shootout");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "penalty-shootout");
  });
});
