import { test } from "@playwright/test";

import { PLAYABLE_SLUGS } from "./helpers/constants";
import { runGameSmoke } from "./helpers/game-flow";

test.describe("Screenshot golden", () => {
  for (const slug of PLAYABLE_SLUGS) {
    test(`screenshot ${slug}`, async ({ page }) => {
      await runGameSmoke(page, slug, { screenshot: true });
    });
  }
});
