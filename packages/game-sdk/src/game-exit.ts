import { emitPlatformAnalyticsEvent } from "./platform-analytics";

/** Player chose Exit/Home — platform may show session summary before leaving. */
export function emitGameExit(gameSlug: string): void {
  emitPlatformAnalyticsEvent({ type: "game-exit", gameSlug });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("replay:game-exit", { detail: { gameSlug } }));
  }
}
