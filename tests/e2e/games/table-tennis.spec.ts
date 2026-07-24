import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Table Tennis", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "table-tennis");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "table-tennis");
  });
});
