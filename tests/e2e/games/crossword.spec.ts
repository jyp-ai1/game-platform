import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Crossword", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "crossword");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "crossword");
  });
});
