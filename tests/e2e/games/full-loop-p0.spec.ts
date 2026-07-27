import { test } from "@playwright/test";

import { buildGameRecord } from "../helpers/full-loop-reporter";
import { runGameFullLoop } from "../helpers/runGameFullLoop";

const P0_SLUGS = ["memory", "air-hockey"] as const;

test.describe("Sprint 13.1 — P0 full loop", () => {
  test.describe.configure({ mode: "serial" });

  for (const slug of P0_SLUGS) {
    test(`${slug} START → GAME OVER → RESULT → RETRY`, async ({ page }) => {
      test.setTimeout(slug === "air-hockey" ? 300_000 : 180_000);

      const outcome = await runGameFullLoop(page, slug, { assertConsoleClean: false });
      const record = buildGameRecord(outcome);

      console.log(`[p0] ${slug}: ${record.verdict}${record.priority ? ` ${record.priority}` : ""}`);
      console.log(
        outcome.steps.map((s) => `${s.id}:${s.status}${s.detail ? ` (${s.detail})` : ""}`).join("\n")
      );

      if (!outcome.passed) {
        throw new Error(`[${slug}] P0 full loop FAIL — ${record.failureCause ?? "see steps"}`);
      }
    });
  }
});
