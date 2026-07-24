import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Space Impact", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "space-impact");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "space-impact");
  });
});
