import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Merge Blocks", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "merge-blocks");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "merge-blocks");
  });
});
