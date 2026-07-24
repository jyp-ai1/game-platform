import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Stack Tower", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "stack-tower");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "stack-tower");
  });
});
