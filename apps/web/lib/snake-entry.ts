"use client";

import { entryLog, entryLogFail, entryTrace } from "@game-platform/game-snake";
import { joinRoomAsync } from "@game-platform/multiplayer-sdk";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export const PRACTICE_URL = "/flagship/snake-io/play?room=PRACTICE";
export const STAGE_PLAY_URL = "/flagship/snake-io/play?room=STAGE";

/** Marker href — use navigateSnakePlay() instead of router.push. */
export const SNAKE_QUICK_PLAY_MARKER = "#snake-quick-play";

export function isSnakeQuickPlayHref(href: string): boolean {
  const base = href.split("?")[0] ?? href;
  return base === SNAKE_QUICK_PLAY_MARKER || /snake-io\/play\?room=WORLD/i.test(href);
}

function isGlobalWorldCode(code: string): boolean {
  const upper = code.toUpperCase();
  return upper === "WORLD" || /^WORLD-\d+$/.test(upper);
}

const WORLD_PLAY_URL = "/flagship/snake-io/play?room=WORLD";

/** Unified Snake quick play — navigate immediately; join happens on play page. */
export async function enterSnakeQuickPlay(router: AppRouterInstance): Promise<void> {
  entryTrace("CLICK", "START", "quick-play");
  entryTrace("CLICK", "PASS", "quick-play", 0);
  entryTrace("ROUTE", "START", WORLD_PLAY_URL);
  router.push(WORLD_PLAY_URL);
  entryTrace("ROUTE", "PASS", WORLD_PLAY_URL, 0);
}

/** Join a specific room (friend/party) or fall back to quick play for WORLD. */
export async function enterSnakeRoom(router: AppRouterInstance, roomCode: string): Promise<void> {
  if (isGlobalWorldCode(roomCode)) {
    await enterSnakeQuickPlay(router);
    return;
  }
  entryTrace("CLICK", "START", `join-room ${roomCode}`);
  try {
    const joined = await joinRoomAsync(roomCode);
    if (!joined) throw new Error("join failed");
    router.push(`/flagship/snake-io/play?room=${encodeURIComponent(roomCode)}`);
  } catch (err) {
    entryLogFail("JOIN", err instanceof Error ? err.message : String(err));
    router.push(`/flagship/snake-io/play?room=${encodeURIComponent(roomCode)}`);
  }
}

/** Resolve motivation/recommendation hrefs — routes WORLD through quick play. */
export async function navigateSnakePlay(href: string, router: AppRouterInstance): Promise<void> {
  if (isSnakeQuickPlayHref(href)) {
    await enterSnakeQuickPlay(router);
    return;
  }
  router.push(href);
}

/** Explicit solo practice — user chose practice, not MP failure disguise. */
export function enterSnakePractice(router: AppRouterInstance): void {
  entryTrace("CLICK", "START", "practice-mode");
  router.push(PRACTICE_URL);
}

export function enterSnakeStage(router: AppRouterInstance): void {
  entryTrace("CLICK", "START", "stage-mode");
  router.push(STAGE_PLAY_URL);
}
