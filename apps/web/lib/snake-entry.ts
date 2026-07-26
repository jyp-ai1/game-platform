"use client";

import { entryLog, entryLogFail } from "@game-platform/game-snake";
import { quickPlayGlobal } from "@game-platform/multiplayer-sdk";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

const PRACTICE_URL = "/flagship/snake-io/play?room=PRACTICE&fallback=1";

/** Unified Snake quick play — all entry surfaces should use this. */
export async function enterSnakeQuickPlay(router: AppRouterInstance): Promise<void> {
  entryLog("CLICK", "quick-play");
  try {
    const { href } = await quickPlayGlobal("snake");
    entryLog("ROUTE", href);
    router.push(href);
  } catch (err) {
    entryLogFail("JOIN", err instanceof Error ? err.message : String(err));
    entryLog("PRACTICE_FALLBACK", "quick-play-join-fail");
    router.push(PRACTICE_URL);
  }
}

export function enterSnakePractice(router: AppRouterInstance): void {
  entryLog("PRACTICE_FALLBACK", "direct-practice");
  router.push(PRACTICE_URL);
}

export { PRACTICE_URL };
