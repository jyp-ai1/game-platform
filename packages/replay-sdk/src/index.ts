/**
 * Replay SDK — unified namespace: logic, multiplayer, publish.
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
  joinRoomAsync,
  ensureRoom,
  leaveRoom,
  send,
  sync,
  start,
  finish,
  spectator,
  replay as reconnectRoom,
  subscribeRoom,
  getPartyLinkUrl,
  shareRoom,
} from "@game-platform/multiplayer-sdk";
import { BalanceEngine, balanceFor } from "@game-platform/replay-engine/balance";

export interface ReplayInitOptions {
  gameSlug: string;
  categorySlug?: string | null;
}

let _initialized = false;
let _gameSlug = "";

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

/** Publish game to marketplace — creator flow hook. */
async function publish(meta: { slug: string; title: string; tags?: string[] }): Promise<{ ok: boolean; slug: string }> {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("replay:publish", { detail: meta }));
  }
  return { ok: true, slug: meta.slug };
}

const logic = {
  inventory: () => ({ enabled: true, api: "Replay.logic.inventory" }),
  save: (slug: string, state: unknown) => saveGame(slug, state),
  load: (slug: string) => loadGame(slug),
  achievement: (id: string) => isAchievementUnlocked(id as Parameters<typeof isAchievementUnlocked>[0]),
  ads: { show: (_p: string) => ({ shown: false }), rewarded: async () => ({ reward: 0 }) },
  ranking: (slug: string, value: number) => recordScoreReport(slug, value),
  stage: (slug: string, state: unknown) => saveGame(slug, state),
  quest: (_id: string) => ({ active: false }),
  mission: (slug: string, value: number) => recordMissionScoreReport(slug, value),
  collection: (slug: string, data: Record<string, boolean>) => saveGame(slug, { collection: data }),
  cloud: {
    save: (slug: string, state: unknown) => saveGame(slug, state),
    load: (slug: string) => loadGame(slug),
    sync: async () => ({ synced: false }),
  },
};

const multiplayer = {
  createRoom,
  join: joinRoom,
  joinAsync: joinRoomAsync,
  ensureRoom,
  leave: leaveRoom,
  send,
  sync,
  start,
  finish,
  voice: async (_roomCode: string) => ({ enabled: false }),
  spectator,
  reconnect: reconnectRoom,
  ranking: (slug: string, score: number) => recordScoreReport(slug, score),
  challenge: (slug: string, score: number) => recordScoreReport(slug, score),
  subscribe: subscribeRoom,
  balance: (gameSlug: string, playerCount: number) => balanceFor(gameSlug, playerCount),
  world: BalanceEngine.world,
  spawn: BalanceEngine.spawn,
  scale: BalanceEngine.scale,
  analytics: BalanceEngine.analytics,
  heatmap: BalanceEngine.heatmap,
  ai: BalanceEngine.ai,
};

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
  submit: (slug: string, value: number) => recordScoreReport(slug, value),
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

const storage = { save: saveGame, load: loadGame };

const cloud = {
  save: (slug: string, state: unknown) => saveGame(slug, state),
  load: (slug: string) => loadGame(slug),
  sync: async () => ({ synced: false, reason: "mvp-local-only" }),
};

const voice = { join: async () => ({ enabled: false }) };
const ai = { prompt: async (_text: string) => ({ response: "" }) };
const share = { partyLink: getPartyLinkUrl, room: shareRoom };
const ads = { show: (_p: string) => ({ shown: false }), rewarded: async () => ({ reward: 0 }) };

export const Replay = {
  init,
  score,
  stage,
  loadStage,
  logic,
  multiplayer,
  reward,
  collection,
  friend,
  challenge,
  analytics,
  storage,
  cloud,
  voice,
  ai,
  share,
  ads,
  publish,
  get initialized() { return _initialized; },
  get gameSlug() { return _gameSlug; },
};

export const submitScore = score;
export function unlockAchievement(id: string): boolean {
  return isAchievementUnlocked(id as Parameters<typeof isAchievementUnlocked>[0]);
}
export { getAchievements };
export const saveStage = stage;
export { loadStage };
export const saveCollection = collection.save;
export { reward, analytics };
export const mission = {
  complete: (s: string, v: number) => recordMissionScoreReport(s, v),
  getDaily: getDailyMission,
};
export { GameSDKProvider, useGameSDK } from "@game-platform/game-sdk";
export { MultiplayerProvider, useRoom } from "@game-platform/multiplayer-sdk";
