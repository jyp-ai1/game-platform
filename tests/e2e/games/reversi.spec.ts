import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Reversi", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "reversi");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "reversi");
  });
});
