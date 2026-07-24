import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Archery", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "archery");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "archery");
  });
});
