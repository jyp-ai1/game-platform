import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Gomoku", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "gomoku");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "gomoku");
  });
});
