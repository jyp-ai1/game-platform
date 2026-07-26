/**
 * Replay SDK — unified namespace for all platform features.
 * Games import ONLY `@game-platform/replay-sdk`.
 */
import {
  recordScoreReport,
  recordNewBest,
  recordSessionStart,
  isAchievementUnlocked,
  getAchievements,
  saveGame,
  loadGame,
  emitPlatformAnalyticsEvent,
  getDailyMission,
  recordMissionScoreReport,
  getDeviceId,
  getLastNickname,
} from "@game-platform/game-sdk";
import {
  createRoom,
  joinRoom,
  send,
  sync,
  start,
  finish,
  spectator,
  getPartyLinkUrl,
  shareRoom,
} from "@game-platform/multiplayer-sdk";

export interface ReplayInitOptions {
  gameSlug: string;
  categorySlug?: string | null;
}

let _initialized = false;
let _gameSlug = "";

/** Initialize Replay SDK for a game session. */
function init(options: ReplayInitOptions): void {
  _initialized = true;
  _gameSlug = options.gameSlug;
  recordSessionStart(options.gameSlug, options.categorySlug ?? null);
}

function score(slug: string, value: number): void {
  recordScoreReport(slug, value);
  recordMissionScoreReport(slug, value);
}

function stage(slug: string, state: unknown): void {
  saveGame(slug, state);
}

function loadStage(slug: string): unknown {
  return loadGame(slug);
}

const reward = {
  coin: (slug: string, value: number) => recordScoreReport(slug, value),
  newBest: (slug: string, value: number) => recordNewBest(slug, value),
};

const collection = {
  save: (slug: string, data: Record<string, boolean>) => saveGame(slug, { collection: data }),
  load: (slug: string) => loadGame(slug),
};

const friend = {
  deviceId: () => getDeviceId(),
  nickname: () => getLastNickname(),
};

const challenge = {
  /** Challenge URL param handled by web app — games emit score for compare. */
  submit: (slug: string, value: number) => recordScoreReport(slug, value),
};

const multiplayer = {
  createRoom,
  joinRoom,
  send,
  sync,
  start,
  finish,
  spectator,
};

const analytics = {
  track: (event: "game-end" | "game-retry" | "save-created" | "save-resumed", slug: string, value?: number) => {
    if (event === "game-end" && value != null) {
      emitPlatformAnalyticsEvent({ type: "game-end", gameSlug: slug, score: value });
    } else if (event !== "game-end") {
      emitPlatformAnalyticsEvent({ type: event, gameSlug: slug });
    }
  },
  sessionStart: (slug: string, category: string | null = null) => recordSessionStart(slug, category),
};

const storage = {
  save: saveGame,
  load: loadGame,
};

const cloud = {
  /** Cloud save — future Supabase sync. MVP: localStorage via storage. */
  save: (slug: string, state: unknown) => saveGame(slug, state),
  load: (slug: string) => loadGame(slug),
  sync: async (_slug: string) => ({ synced: false, reason: "mvp-local-only" }),
};

const voice = {
  /** Voice chat — future WebRTC. */
  join: async (_roomCode: string) => ({ enabled: false }),
};

const ai = {
  /** AI NPC / events — future integration. */
  prompt: async (_text: string) => ({ response: "" }),
};

const share = {
  partyLink: getPartyLinkUrl,
  room: shareRoom,
};

const ads = {
  /** Ad placement — future AdSense integration. */
  show: (_placement: string) => ({ shown: false }),
  rewarded: async (_placement: string) => ({ reward: 0 }),
};

/** Unified Replay namespace — `Replay.init()`, `Replay.score()`, etc. */
export const Replay = {
  init,
  score,
  stage,
  loadStage,
  reward,
  collection,
  friend,
  challenge,
  multiplayer,
  analytics,
  storage,
  cloud,
  voice,
  ai,
  share,
  ads,
  get initialized() {
    return _initialized;
  },
  get gameSlug() {
    return _gameSlug;
  },
};

// Legacy flat exports (backward compat)
export const submitScore = score;
export function unlockAchievement(id: string): boolean {
  return isAchievementUnlocked(id as Parameters<typeof isAchievementUnlocked>[0]);
}
export { getAchievements };
export const saveStage = stage;
export { loadStage };
export const saveCollection = collection.save;
export { multiplayer, reward, analytics };
export const mission = {
  complete: (s: string, v: number) => recordMissionScoreReport(s, v),
  getDaily: getDailyMission,
};
export { GameSDKProvider, useGameSDK } from "@game-platform/game-sdk";
export { MultiplayerProvider, useRoom } from "@game-platform/multiplayer-sdk";
