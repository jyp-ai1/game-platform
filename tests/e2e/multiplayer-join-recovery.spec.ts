import { test, expect } from "@playwright/test";

import {
  attachGoldenPathMonitors,
  expectGameReady,
  expectInputWorks,
} from "./helpers/golden-path";

const JOIN_ITERATIONS = process.env.JOIN_TEST_COUNT
  ? Number(process.env.JOIN_TEST_COUNT)
  : 10;

interface JoinRunResult {
  success: boolean;
  practiceFallback: boolean;
  joinMs: number | null;
  retried: boolean;
  error?: string;
}

async function measureQuickPlayJoin(page: import("@playwright/test").Page): Promise<JoinRunResult> {
  const logs: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[ENTRY]")) logs.push(text);
  });

  const t0 = Date.now();
  await page.goto("/");
  await page.getByRole("button", { name: /바로 참가/ }).first().click();
  await page.waitForURL(/\/flagship\/snake-io\/play/, { timeout: 25_000 });

  const practiceFallback = page.url().includes("room=PRACTICE");
  let joinMs: number | null = null;

  const joinPass = logs.find((l) => l.includes("[ENTRY] JOIN PASS"));
  const joinFail = logs.find((l) => l.includes("[ENTRY] JOIN FAIL"));
  const joinMatch = joinPass?.match(/(\d+)ms/);
  if (joinMatch) joinMs = Number(joinMatch[1]);

  try {
    await expectGameReady(page, 30_000);
    await expectInputWorks(page);
    return {
      success: !practiceFallback && !joinFail,
      practiceFallback,
      joinMs,
      retried: logs.some((l) => l.includes("[ENTRY] RETRY")),
    };
  } catch (err) {
    return {
      success: false,
      practiceFallback,
      joinMs,
      retried: logs.some((l) => l.includes("[ENTRY] RETRY")),
      error: err instanceof Error ? err.message : String(err),
      elapsed: Date.now() - t0,
    } as JoinRunResult & { elapsed?: number };
  }
}

test.describe("Multiplayer Recovery — Join Success Rate", () => {
  test(`Home → Quick Play join (${JOIN_ITERATIONS} runs)`, async ({ page }) => {
    const { consoleMon } = attachGoldenPathMonitors(page);
    const results: JoinRunResult[] = [];

    for (let i = 0; i < JOIN_ITERATIONS; i++) {
      const result = await measureQuickPlayJoin(page);
      results.push(result);
      consoleMon.assertClean();
    }

    const success = results.filter((r) => r.success).length;
    const practice = results.filter((r) => r.practiceFallback).length;
    const retried = results.filter((r) => r.retried).length;
    const joinTimes = results.map((r) => r.joinMs).filter((ms): ms is number => ms !== null);
    const avgJoin =
      joinTimes.length > 0
        ? joinTimes.reduce((a, b) => a + b, 0) / joinTimes.length
        : 0;

    console.log(
      JSON.stringify({
        joinSuccess: `${success}/${JOIN_ITERATIONS}`,
        practiceFallback: practice,
        retryRate: `${Math.round((retried / JOIN_ITERATIONS) * 100)}%`,
        averageJoinMs: Math.round(avgJoin),
      })
    );

    expect(success).toBeGreaterThanOrEqual(Math.ceil(JOIN_ITERATIONS * 0.9));
    expect(practice).toBeLessThanOrEqual(Math.ceil(JOIN_ITERATIONS * 0.1));
  });

  test("Direct WORLD URL → game ready or practice fallback", async ({ page }) => {
    const { consoleMon, entry } = attachGoldenPathMonitors(page);
    await page.goto("/flagship/snake-io/play?room=WORLD");
    await page.waitForURL(/room=(WORLD|PRACTICE)/, { timeout: 30_000 });
    await expect(page.getByText(/Application error|문제가 발생/i)).not.toBeVisible();
    await expectGameReady(page, 30_000);
    entry.assertSteps(["CONNECT"]);
    consoleMon.assertClean();
  });

  test("Entry trace includes PASS/FAIL timing", async ({ page }) => {
    const { consoleMon, entry } = attachGoldenPathMonitors(page);
    await page.goto("/");
    await page.getByRole("button", { name: /바로 참가/ }).first().click();
    await page.waitForURL(/\/flagship\/snake-io\/play/, { timeout: 25_000 });
    await expectGameReady(page, 30_000);

    const steps = entry.getSteps();
    expect(steps.some((s) => /\[ENTRY\] .+ PASS \d+ms/.test(s))).toBeTruthy();
    consoleMon.assertClean();
  });
});
