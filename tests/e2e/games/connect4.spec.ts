import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Connect4", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "connect4");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "connect4");
  });
});
