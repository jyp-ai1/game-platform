import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Sudoku", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "sudoku");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "sudoku");
  });
});
