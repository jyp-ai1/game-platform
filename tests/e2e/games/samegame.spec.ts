import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Samegame", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "samegame");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "samegame");
  });
});
