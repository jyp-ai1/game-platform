import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Chess960", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "chess960");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "chess960");
  });
});
