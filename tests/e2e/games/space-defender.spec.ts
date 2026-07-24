import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Space Defender", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "space-defender");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "space-defender");
  });
});
