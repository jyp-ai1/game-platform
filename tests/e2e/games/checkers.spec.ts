import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Checkers", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "checkers");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "checkers");
  });
});
