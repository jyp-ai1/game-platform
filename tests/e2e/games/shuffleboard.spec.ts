import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Shuffleboard", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "shuffleboard");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "shuffleboard");
  });
});
