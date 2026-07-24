import { test } from "@playwright/test";

import { runGameRegression, runGameSmoke } from "../helpers/game-flow";

test.describe("Jigsaw", () => {
  test("open → start → interact → PASS", async ({ page }) => {
    await runGameSmoke(page, "jigsaw");
  });

  test("regression: play + ranking section", async ({ page }) => {
    await runGameRegression(page, "jigsaw");
  });
});
