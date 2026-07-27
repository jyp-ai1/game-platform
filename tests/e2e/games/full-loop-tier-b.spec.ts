import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { test } from "@playwright/test";

import { TIER_B_FULL_LOOP_SLUGS, getGameLoopProfile } from "../helpers/game-loop-profiles";
import {
  buildGameRecord,
  formatSummaryLine,
  writeFullLoopReport,
  type FullLoopGameRecord,
} from "../helpers/full-loop-reporter";
import { runGameFullLoop } from "../helpers/runGameFullLoop";

const REPO_ROOT = process.cwd();
const REPORT_DATE = process.env.QA_FULL_LOOP_DATE ?? new Date().toISOString().slice(0, 10);
const LOOP_OVERHEAD_MS = 90_000;

function perGameTimeoutMs(slug: string): number {
  const envOverride = Number(process.env.QA_FULL_LOOP_GAME_TIMEOUT_MS ?? 0);
  if (envOverride > 0) return envOverride;
  const profile = getGameLoopProfile(slug);
  return (profile.gameOverTimeoutMs ?? 60_000) + LOOP_OVERHEAD_MS;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

test.describe("Sprint 13 — Tier B full loop (collect)", () => {
  test("collect all Tier B games", async ({ page }) => {
    const totalTimeout =
      TIER_B_FULL_LOOP_SLUGS.reduce((sum, slug) => sum + perGameTimeoutMs(slug), 0) + 60_000;
    test.setTimeout(totalTimeout);

    const results: FullLoopGameRecord[] = [];
    const artifactDir = path.join(REPO_ROOT, "docs/reports/full-loop", REPORT_DATE, "artifacts");
    await mkdir(artifactDir, { recursive: true });

    for (const slug of TIER_B_FULL_LOOP_SLUGS) {
      try {
        const outcome = await withTimeout(
          runGameFullLoop(page, slug, { assertConsoleClean: false }),
          perGameTimeoutMs(slug),
          slug
        );
        const consoleLogs = outcome.consoleLogs ?? [];

        let record = buildGameRecord(outcome, { consoleLogs });
        const needsArtifact = record.verdict !== "PASS";

        if (needsArtifact) {
          const screenshotPath = path.join(artifactDir, `${slug}.png`);
          const logPath = path.join(artifactDir, `${slug}.log.json`);

          await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
          await writeFile(
            logPath,
            JSON.stringify(
              {
                slug,
                verdict: record.verdict,
                priority: record.priority,
                steps: outcome.steps,
                score: outcome.score,
                analyticsTypes: outcome.analyticsTypes,
                consoleLogs,
                durationMs: outcome.durationMs,
              },
              null,
              2
            ),
            "utf8"
          );

          record = buildGameRecord(outcome, { consoleLogs, screenshotPath, logPath });
        }

        results.push(record);
        console.log(`[full-loop] ${slug}: ${record.verdict}${record.priority ? ` ${record.priority}` : ""}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const screenshotPath = path.join(artifactDir, `${slug}.png`);
        const logPath = path.join(artifactDir, `${slug}.log.json`);

        await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
        await writeFile(logPath, JSON.stringify({ slug, crash: message }, null, 2), "utf8");

        results.push(
          buildGameRecord(
            {
              slug,
              steps: [{ id: "gameOver", status: "fail", detail: message }],
              passed: false,
              score: null,
              analyticsTypes: [],
              consoleErrors: 1,
              consoleLogs: [message],
              durationMs: 0,
              storageAfter: {
                xp: 0,
                coins: 0,
                bestScore: 0,
                dailyMission: null,
                journey: null,
                gamePlayCounts: null,
                replayMoments: null,
                totalPlayCount: 0,
              },
            },
            { thrownError: message, screenshotPath, logPath, consoleLogs: [message] }
          )
        );
        console.log(`[full-loop] ${slug}: FAIL P0 (${message.slice(0, 60)})`);
      }
    }

    const bundle = await writeFullLoopReport(results, REPO_ROOT, REPORT_DATE);
    console.log("\n=== Sprint 13 Full Loop QA ===");
    console.log(formatSummaryLine(bundle));
    console.log(`Report: docs/reports/full-loop/${REPORT_DATE}/${REPORT_DATE}.md`);

    // QA collect mode: always pass — FAIL is data, not CI gate
    test.info().annotations.push({
      type: "summary",
      description: formatSummaryLine(bundle),
    });
  });
});

test.describe("Sprint 13 — Snake (Sprint 14)", () => {
  test("snake skipped — multiplayer", async ({ page }) => {
    const outcome = await runGameFullLoop(page, "snake", { assertConsoleClean: false });
    const record = buildGameRecord(outcome);
    console.log(`[full-loop] snake: ${record.verdict} (Sprint 14)`);
  });
});
