import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Nonogram", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "nonogram");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "nonogram");
  });
});
