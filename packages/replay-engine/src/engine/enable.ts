/**
 * Browser Game Engine — single entry point for all games.
 * Replay.Engine.enable({ gameSlug }) — 끝.
 */
import { recordSessionStart } from "@game-platform/game-sdk";

export interface EngineEnableOptions {
  gameSlug: string;
  categorySlug?: string | null;
  multiplayer?: boolean;
  party?: boolean;
}

export interface EngineEnableResult {
  ready: boolean;
  gameSlug: string;
  engines: string[];
}

const ENGINE_MODULES = [
  "runtime",
  "save",
  "reward",
  "identity",
  "mission",
  "collection",
  "stage",
  "cloud",
  "notification",
  "party",
  "friends",
  "voice",
  "tournament",
  "matchmaking",
  "moment",
  "leaderboard",
  "achievements",
  "aiDirector",
  "feed",
  "balance",
  "multiplayer",
  "analytics",
] as const;

/** Enable full Browser Game Engine for a game — one call. */
export function enableEngine(options: EngineEnableOptions): EngineEnableResult {
  recordSessionStart(options.gameSlug, options.categorySlug ?? null);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("replay:engine-enabled", { detail: options }));
  }
  return {
    ready: true,
    gameSlug: options.gameSlug,
    engines: [...ENGINE_MODULES],
  };
}

export const BrowserGameEngine = {
  enable: enableEngine,
  modules: ENGINE_MODULES,
};
