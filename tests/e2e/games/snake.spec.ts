import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Snake", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "snake");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "snake");
  });
});
