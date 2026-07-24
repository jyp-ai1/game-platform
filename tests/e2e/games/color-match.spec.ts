import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Color Match", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "color-match");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "color-match");
  });
});
