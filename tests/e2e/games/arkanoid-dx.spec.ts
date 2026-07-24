import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Arkanoid Dx", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "arkanoid-dx");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "arkanoid-dx");
  });
});
