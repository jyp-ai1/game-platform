import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Gold Miner", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "gold-miner");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "gold-miner");
  });
});
