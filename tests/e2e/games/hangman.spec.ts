import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Hangman", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "hangman");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "hangman");
  });
});
