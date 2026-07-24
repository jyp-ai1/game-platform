import { emitPlatformAnalyticsEvent } from "./platform-analytics";

/** Emit when the player taps Retry after game over (maps to game_start + retry metadata). */
export function emitGameRetry(gameSlug: string): void {
  emitPlatformAnalyticsEvent({ type: "game-retry", gameSlug });
}
