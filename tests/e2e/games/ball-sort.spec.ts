import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Ball Sort", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "ball-sort");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "ball-sort");
  });
});
