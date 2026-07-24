import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Billiards", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "billiards");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "billiards");
  });
});
