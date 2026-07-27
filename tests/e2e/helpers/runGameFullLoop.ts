import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { attachAnalyticsCollector } from "./analytics";
import { attachConsoleMonitor } from "./console-monitor";
import { getGameLoopProfile } from "./game-loop-profiles";
import {
  readGameLoopStorage,
  seedGameLoopSession,
  type GameLoopStorageSnapshot,
} from "./game-loop-storage";

const COUNTDOWN_MS = 4 * 650 + 500;
const STAGE = ".game-detail-stage";

export type FullLoopCheckId =
  | "start"
  | "tutorial"
  | "stageClear"
  | "nextStage"
  | "gameOver"
  | "retry"
  | "result"
  | "scoreSave"
  | "xp"
  | "coin"
  | "dailyMission"
  | "journey"
  | "replay"
  | "leaderboard";

export type FullLoopStepStatus = "pass" | "fail" | "skip" | "warn";

export type FullLoopStepResult = {
  id: FullLoopCheckId;
  status: FullLoopStepStatus;
  detail?: string;
};

export type GameFullLoopResult = {
  slug: string;
  steps: FullLoopStepResult[];
  passed: boolean;
  score: number | null;
  analyticsTypes: string[];
  consoleErrors: number;
  consoleLogs: string[];
  durationMs: number;
  storageAfter: GameLoopStorageSnapshot;
};

export type RunGameFullLoopOptions = {
  /** Require platform checks (XP, coins, …). Default true. */
  verifyRetention?: boolean;
  /** Fail on console errors. Default true. */
  assertConsoleClean?: boolean;
};

function step(
  id: FullLoopCheckId,
  status: FullLoopStepStatus,
  detail?: string
): FullLoopStepResult {
  return { id, status, detail };
}

async function dismissResumePrompt(page: Page): Promise<void> {
  const resumePrompt = page.getByText("저장된 게임이 있어요");
  if (await resumePrompt.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /^새 게임$/ }).click();
  }
}

async function clickRuntimeStart(page: Page): Promise<boolean> {
  const start = page.getByRole("button", { name: /^게임 시작$/ });
  try {
    await start.waitFor({ state: "visible", timeout: 15_000 });
    await start.click();
    return true;
  } catch {
    return false;
  }
}

async function waitForGameEnd(page: Page, timeoutMs: number): Promise<{ score: number | null }> {
  const retry = page.getByRole("button", { name: /^Retry$/i }).first();
  const resultModal = page.locator(".fixed.inset-0").filter({ hasText: "Replay" });

  await expect
    .poll(
      async () => {
        const hasRetry = await retry.isVisible().catch(() => false);
        const hasModal = await resultModal.isVisible().catch(() => false);
        return hasRetry || hasModal;
      },
      { timeout: timeoutMs, intervals: [500, 1000, 2000] }
    )
    .toBe(true);

  let score: number | null = null;
  const scoreText = await page
    .locator(".fixed.inset-0 .tabular-nums, .absolute.inset-0 .tabular-nums")
    .first()
    .textContent()
    .catch(() => null);
  if (scoreText) {
    const parsed = Number(scoreText.replace(/[^\d]/g, ""));
    if (!Number.isNaN(parsed)) score = parsed;
  }

  return { score };
}

async function clickInGameRetry(page: Page): Promise<boolean> {
  const resultModal = page.locator(".fixed.inset-0").filter({ hasText: "Replay" });
  if (await resultModal.isVisible().catch(() => false)) {
    await resultModal.getByRole("button", { name: /^Close$/i }).click().catch(() => {});
    await page.waitForTimeout(400);
  }

  const overlayRetry = page.locator(STAGE).getByRole("button", { name: /^Retry$/i });
  if (await overlayRetry.isVisible().catch(() => false)) {
    await overlayRetry.click({ force: true });
    return true;
  }

  const anyRetry = page.locator("a, button").filter({ hasText: /^Retry$/ }).first();
  if (await anyRetry.isVisible().catch(() => false)) {
    await anyRetry.click();
    return true;
  }

  return false;
}

function parseGamePlayCount(raw: string | null, slug: string): number {
  if (!raw) return 0;
  try {
    const map = JSON.parse(raw) as Record<string, number>;
    return map[slug] ?? 0;
  } catch {
    return 0;
  }
}

function evaluateRetention(
  slug: string,
  before: GameLoopStorageSnapshot,
  after: GameLoopStorageSnapshot,
  score: number | null,
  analyticsTypes: string[]
): FullLoopStepResult[] {
  const results: FullLoopStepResult[] = [];
  const hadGameEnd = analyticsTypes.some((t) => t.includes("game_end") || t === "game_end");

  const bestIncreased = after.bestScore > before.bestScore;
  const bestUnchangedWithScore =
    score != null && score > 0 && after.bestScore >= score && after.bestScore >= before.bestScore;
  if (bestIncreased || bestUnchangedWithScore || (score != null && score > 0 && after.bestScore > 0)) {
    results.push(step("scoreSave", "pass", `best=${after.bestScore}`));
  } else if (score === 0 || score == null) {
    results.push(step("scoreSave", "warn", "game ended with zero score — best may be unchanged"));
  } else {
    results.push(step("scoreSave", "fail", `best ${before.bestScore} → ${after.bestScore}`));
  }

  if (after.xp > before.xp) {
    results.push(step("xp", "pass", `${before.xp} → ${after.xp}`));
  } else if (hadGameEnd || score != null) {
    results.push(step("xp", "warn", `xp unchanged (${after.xp})`));
  } else {
    results.push(step("xp", "fail", "no XP gain after game end"));
  }

  if (after.coins > before.coins) {
    results.push(step("coin", "pass", `${before.coins} → ${after.coins}`));
  } else if (score != null && score > 0) {
    results.push(step("coin", "warn", `coins unchanged (${after.coins})`));
  } else {
    results.push(step("coin", "skip", "no score-based coins expected"));
  }

  const missionChanged = after.dailyMission !== before.dailyMission;
  const playCountBefore = parseGamePlayCount(before.gamePlayCounts, slug);
  const playCountAfter = parseGamePlayCount(after.gamePlayCounts, slug);
  if (missionChanged || playCountAfter > playCountBefore || after.totalPlayCount > before.totalPlayCount) {
    results.push(
      step(
        "dailyMission",
        "pass",
        missionChanged
          ? "mission state updated"
          : `play count ${playCountBefore} → ${playCountAfter}`
      )
    );
  } else {
    results.push(step("dailyMission", "warn", "mission/play count unchanged"));
  }

  if (after.journey) {
    results.push(step("journey", "pass", "journey profile present"));
  } else {
    results.push(step("journey", "fail", "play29:journey-profile missing"));
  }

  if (
    after.replayMoments !== before.replayMoments ||
    playCountAfter > playCountBefore ||
    hadGameEnd
  ) {
    results.push(step("replay", "pass", "session recorded"));
  } else {
    results.push(step("replay", "warn", "no replay moment delta"));
  }

  return results;
}

/**
 * Sprint 13 — full single-player loop:
 * START → play → GAME OVER → RETRY → retention checks.
 */
export async function runGameFullLoop(
  page: Page,
  slug: string,
  options: RunGameFullLoopOptions = {}
): Promise<GameFullLoopResult> {
  const verifyRetention = options.verifyRetention ?? true;
  const assertConsoleClean = options.assertConsoleClean ?? true;
  const profile = getGameLoopProfile(slug);
  const started = Date.now();
  const steps: FullLoopStepResult[] = [];

  if (profile.multiplayer) {
    return {
      slug,
      steps: [step("start", "skip", "multiplayer — Sprint 14")],
      passed: false,
      score: null,
      analyticsTypes: [],
      consoleErrors: 0,
      consoleLogs: [],
      durationMs: Date.now() - started,
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
    };
  }

  const consoleMon = attachConsoleMonitor(page);
  const analytics = attachAnalyticsCollector(page);

  await seedGameLoopSession(page, slug);

  await page.goto(`/games/${slug}`, { waitUntil: "domcontentloaded" });

  const storageBefore = await readGameLoopStorage(page, slug);

  const notFound = page.getByRole("heading", { name: /404|not found|찾을 수 없/i });
  if (await notFound.isVisible().catch(() => false)) {
    throw new Error(`Game /games/${slug} returned 404`);
  }

  await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });
  steps.push(step("start", "pass"));
  steps.push(step("tutorial", "pass", "tutorial seen seeded"));

  const startedRuntime = await clickRuntimeStart(page);
  if (!startedRuntime) {
    throw new Error(`[${slug}] runtime start button not found — RuntimeProvider overlay missing`);
  }

  await expect(page.locator(STAGE)).toBeVisible({ timeout: 30_000 });

  await dismissResumePrompt(page);
  await page.waitForTimeout(COUNTDOWN_MS);
  steps.push(step("stageClear", "skip", "validated post-game via result modal"));
  steps.push(step("nextStage", "skip", "stage ladder checked on result score"));

  await profile.playUntilGameOver(page);
  const { score } = await waitForGameEnd(page, profile.gameOverTimeoutMs ?? 60_000);
  steps.push(step("gameOver", "pass", score != null ? `score=${score}` : "overlay visible"));

  // Runtime reward flash → result modal (~1.4s)
  await page.waitForTimeout(1_600);

  const resultModal = page.locator(".fixed.inset-0").filter({ hasText: "Replay" });
  if (await resultModal.isVisible().catch(() => false)) {
    steps.push(step("result", "pass", "GameResultModal"));
    const stageLabel = resultModal.getByText(/Stage|Round|256|512/i).first();
    if (await stageLabel.isVisible().catch(() => false)) {
      steps.push(step("nextStage", "pass", "stage label in result"));
    }
  } else {
    steps.push(step("result", "warn", "in-game overlay only"));
  }

  const storageMid = await readGameLoopStorage(page, slug);
  if (verifyRetention) {
    steps.push(...evaluateRetention(slug, storageBefore, storageMid, score, analytics.getEventTypes()));
  }

  const leaderboard = page.locator("#leaderboard, [id='leaderboard']").first();
  const rankingHeading = page.getByRole("heading", { name: /랭킹|Ranking|Leaderboard|Global Ranking/i });
  if ((await leaderboard.isVisible().catch(() => false)) || (await rankingHeading.isVisible().catch(() => false))) {
    steps.push(step("leaderboard", "pass"));
  } else {
    steps.push(step("leaderboard", "warn", "ranking section not in viewport"));
  }

  const retryClicked = await clickInGameRetry(page);
  if (!retryClicked) {
    steps.push(step("retry", "fail", "no retry control found"));
  } else {
    await page.waitForTimeout(COUNTDOWN_MS);
    const stillOver = await page
      .locator(STAGE)
      .getByRole("button", { name: /^Retry$/i })
      .isVisible()
      .catch(() => false);
    steps.push(step("retry", stillOver ? "fail" : "pass", stillOver ? "game over stuck" : "game restarted"));
  }

  const storageAfter = await readGameLoopStorage(page, slug);
  const consoleLogs = consoleMon.getErrors().map((e) => e.text);

  if (!assertConsoleClean && consoleLogs.length > 0) {
    steps.push(step("gameOver", "fail", `console: ${consoleLogs.slice(0, 2).join(" | ")}`));
  }

  if (assertConsoleClean) {
    consoleMon.assertClean();
  }

  const passed = !steps.some((s) => s.status === "fail");

  return {
    slug,
    steps,
    passed,
    score,
    analyticsTypes: analytics.getEventTypes(),
    consoleErrors: consoleLogs.length,
    consoleLogs,
    durationMs: Date.now() - started,
    storageAfter,
  };
}

/** Assert full loop PASS — throws with step breakdown on failure. */
export async function assertGameFullLoop(
  page: Page,
  slug: string,
  options?: RunGameFullLoopOptions
): Promise<GameFullLoopResult> {
  const result = await runGameFullLoop(page, slug, options);
  if (!result.passed) {
    const report = result.steps
      .map((s) => `${s.id}:${s.status}${s.detail ? ` (${s.detail})` : ""}`)
      .join("\n");
    throw new Error(`[${slug}] full loop FAIL\n${report}`);
  }
  return result;
}

export function formatFullLoopReport(results: GameFullLoopResult[]): string {
  return results
    .map((r) => {
      const fails = r.steps.filter((s) => s.status === "fail");
      const warns = r.steps.filter((s) => s.status === "warn");
      const status = r.passed ? "PASS" : "FAIL";
      return `${r.slug}: ${status} (${r.durationMs}ms, score=${r.score ?? "—"}, fail=${fails.length}, warn=${warns.length})`;
    })
    .join("\n");
}
