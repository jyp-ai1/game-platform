import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Chess", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "chess");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "chess");
  });
});
