import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Word Search", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "word-search");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "word-search");
  });
});
