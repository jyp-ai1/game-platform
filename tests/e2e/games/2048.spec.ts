import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("2048", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "2048");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "2048");
  });
});
