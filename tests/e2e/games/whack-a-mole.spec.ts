import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Whack A Mole", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "whack-a-mole");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "whack-a-mole");
  });
});
