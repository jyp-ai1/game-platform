import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Mancala", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "mancala");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "mancala");
  });
});
