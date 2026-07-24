import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Tank Battle", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "tank-battle");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "tank-battle");
  });
});
