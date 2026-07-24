import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Minesweeper", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "minesweeper");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "minesweeper");
  });
});
