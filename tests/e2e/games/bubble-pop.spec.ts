import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Bubble Pop", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "bubble-pop");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "bubble-pop");
  });
});
