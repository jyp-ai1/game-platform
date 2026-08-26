"use client";

import { entryLog, entryLogFail, entryTrace } from "@game-platform/game-snake";
import { joinRoomAsync } from "@game-platform/multiplayer-sdk";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

const PRACTICE_URL = "/flagship/snake-io/play?room=PRACTICE&fallback=1";
export const STAGE_PLAY_URL = "/flagship/snake-io/play?room=STAGE";

/** Marker href — use navigateSnakePlay() instead of router.push. */
export const SNAKE_QUICK_PLAY_MARKER = "#snake-quick-play";

export function isSnakeQuickPlayHref(href: string): boolean {
  const base = href.split("?")[0] ?? href;
  if (base === SNAKE_QUICK_PLAY_MARKER) return true;
  const m = href.match(/snake-io\/play\?[^#]*room=([^&]+)/i);
  if (!m) return false;
  // Only bare WORLD is quick-play — WORLD-* shards must keep their code.
  return decodeURIComponent(m[1]!).toUpperCase() === "WORLD";
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

/** Join a specific room (friend/party) or fall back to quick play for bare WORLD. */
export async function enterSnakeRoom(router: AppRouterInstance, roomCode: string): Promise<void> {
  const upper = roomCode.toUpperCase();
  // Bare WORLD → cluster resolve on play page. Pinned WORLD-* must keep the shard.
  if (upper === "WORLD") {
    await enterSnakeQuickPlay(router);
    return;
  }
  if (/^WORLD-[A-Z0-9]+$/.test(upper)) {
    entryTrace("CLICK", "START", `join-world-shard ${upper}`);
    const href = `/flagship/snake-io/play?room=${encodeURIComponent(upper)}&source=invite`;
    entryTrace("ROUTE", "START", href);
    router.push(href);
    entryTrace("ROUTE", "PASS", href, 0);
    return;
  }
  entryTrace("CLICK", "START", `join-room ${roomCode}`);
  try {
    const joined = await joinRoomAsync(roomCode);
    if (!joined) throw new Error("join failed");
    router.push(`/flagship/snake-io/play?room=${encodeURIComponent(roomCode)}`);
  } catch (err) {
    entryLogFail("JOIN", err instanceof Error ? err.message : String(err));
    // Non-WORLD rooms only — never invent PRACTICE when an invite room was requested.
    entryTrace("PRACTICE_FALLBACK", "PASS", "join-room-fail");
    router.push(PRACTICE_URL);
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

export function enterSnakePractice(router: AppRouterInstance): void {
  entryTrace("PRACTICE_FALLBACK", "PASS", "direct-practice");
  router.push(PRACTICE_URL);
}

export function enterSnakeStage(router: AppRouterInstance): void {
  entryTrace("CLICK", "START", "stage-mode");
  router.push(STAGE_PLAY_URL);
}

export { PRACTICE_URL };
