import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Galaxy Defender", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "galaxy-defender");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "galaxy-defender");
  });
});
