import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Tic Tac Toe", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "tic-tac-toe");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "tic-tac-toe");
  });
});
