import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Darts", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "darts");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "darts");
  });
});
