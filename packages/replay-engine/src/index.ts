/**
 * @game-platform/replay-engine — Replay Game Operating System core.
 */
import { Replay } from "@game-platform/replay-sdk";

import { emit, emitSimple, on } from "./event-bus";
import { initCoreRegistry, listServices, registerService, getService } from "./registry";
import {
  BUILTIN_PLUGINS,
  configureGamePlugins,
  DEFAULT_GAME_PLUGINS,
  MULTIPLAYER_GAME_PLUGINS,
  enablePlugin,
  disablePlugin,
  isPluginEnabled,
  listPlugins,
  usePlugin,
  type PluginId,
} from "./plugins";
import { Runtime } from "./engines/runtime";
import { Multiplayer } from "./engines/multiplayer";
import { Identity } from "./engines/identity";
import { Stage } from "./engines/stage";
import { Cloud } from "./engines/cloud";
import { Achievement } from "./engines/achievement";
import { Collection } from "./engines/collection";
import { Analytics } from "./engines/analytics";
import { Notification } from "./engines/notification";
import { AI } from "./engines/ai";

initCoreRegistry();

/** Replay Engine namespace — Game Operating System API. */
export const Engine = {
  Runtime,
  Multiplayer,
  Identity,
  Stage,
  Cloud,
  Achievement,
  Collection,
  Analytics,
  Notification,
  AI,
};

/** Full Replay API — Engine + legacy SDK + OS primitives. */
export const ReplayOS = {
  Engine,
  Replay,
  bus: { emit, emitSimple, on },
  registry: { listServices, registerService, getService },
  plugins: {
    list: listPlugins,
    use: usePlugin,
    enable: enablePlugin,
    disable: disablePlugin,
    isEnabled: isPluginEnabled,
    configure: configureGamePlugins,
    DEFAULT: DEFAULT_GAME_PLUGINS,
    MULTIPLAYER: MULTIPLAYER_GAME_PLUGINS,
    BUILTIN: BUILTIN_PLUGINS,
  },
};

export {
  Engine as ReplayEngine,
  emit,
  emitSimple,
  on,
  listServices,
  listPlugins,
  configureGamePlugins,
  DEFAULT_GAME_PLUGINS,
  MULTIPLAYER_GAME_PLUGINS,
};
export type { ReplayPlugin, PluginId } from "./plugins";
export type { ReplayEvent, ReplayEventType } from "./event-bus";
export type { ReplayService } from "./registry";

export { Multiplayer } from "./multiplayer";
export {
  createRoom,
  joinRoom,
  joinRoomAsync,
  ensureRoom,
  send,
  sync,
  start,
  finish,
  subscribeRoom as subscribeMultiplayerRoom,
} from "./multiplayer";

export {
  getNotifications,
  getUnreadCount,
  pushNotification,
  markRead,
  markAllRead,
  subscribeNotifications,
  refreshMotivationNotifications,
  Notification,
} from "./engines/notification";
export type { ReplayNotification, NotificationKind } from "./engines/notification";

export {
  getAiIssues,
  generateAiIssues,
  runAiIssuePipeline,
  pushAiIssue,
  subscribeAiIssues,
  AI,
} from "./engines/ai";
export type { AiIssue, AiIssueContext, AiIssueSeverity, AiIssueSource } from "./engines/ai";

export { BalanceEngine, balanceFor } from "./multiplayer/balance";

// Re-export SDK for single import path
export { Replay, GameSDKProvider, useGameSDK, MultiplayerProvider, useRoom } from "@game-platform/replay-sdk";
