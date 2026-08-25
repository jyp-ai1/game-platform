export { SnakeEngineAuditPanel } from "./SnakeEngineAuditPanel";
export { SNAKE_MVP_RC1, resolveSnakeHead } from "./snake-mvp-rc1";
export {
  getEngineAuditSnapshot,
  isEngineAuditEnabled,
  subscribeEngineAudit,
  type EngineAuditSnapshot,
} from "./snake-engine-audit-store";
export { SnakeGame } from "./Snake";
export { SnakeIoGame } from "./SnakeIo";
export { SnakeCharacterSelect } from "./SnakeCharacterSelect";
export {
  SNAKE_HEAD_CHARACTERS,
  SNAKE_HEAD_IDS,
  loadSnakeHeadCharacter,
  saveSnakeHeadCharacter,
  loadSnakeBodyColor,
  saveSnakeBodyColor,
  resolveHeadEmoji,
  type SnakeHeadId,
} from "./snake-characters";
export { entryLog, entryLogFail, entryTrace, type EntryStep, type EntryFailStep } from "./snake-entry-log";
export { claimEngineSession, resetEngineSession } from "./snake-play-session";
export { getGamePhase, resetGamePhase, transitionGamePhase, type GamePhase } from "./snake-game-state";
export { getFoodVisual, rollFoodTier, FOOD_TIERS, type FoodTier } from "./snake-food-types";
export {
  getEntryStatusSnapshot,
  recordJoinRoomDebug,
  resetEntryStatus,
  subscribeEntryStatus,
  type EntryStatusSnapshot,
  type JoinRoomDebug,
  type TraceStep,
} from "./entry-status-store";
export { EntryCrashLog } from "@game-platform/multiplayer-sdk";
export {
  buildPartyMemoryLines,
  loadSnakeDayMemory,
  recordSnakeSessionEnd,
  type MemoryLine,
  type SnakeDayMemory,
} from "./snake-session-recap";
export { GlobalWorldPersist, type GlobalWorldJoinBrief } from "./snake-global-world";
export { SnakeAiFillEngine, SNAKE_WORLD_TARGET, isBotSnake, createLocalSnake, ensureLocalSnake, type BotRole } from "./snake-ai-fill";
export { PlaytestLog, appendPlaytestLog, evaluateMergeGates, type PlaytestLogEntry } from "./snake-playtest-log";
export {
  PlaytestObservation,
  appendObservationSheet,
  evaluateObservationGates,
  type ObservationSheet,
  type PlayerSegment,
  type FunBreakAt,
  type FunBreakWhy,
  type StrangerTestEntry,
} from "./snake-playtest-observation";
export { PlaytestReport, generatePlaytestReport, type PlaytestReportData } from "./snake-playtest-report";
export { PlaytestHeatmap, buildPlaytestHeatmap, type PlaytestHeatmapSummary } from "./snake-playtest-heatmap";
export { PLAYTEST_AI, PLAYTEST_MERGE_GATES, POST_DEATH_ACTION_MS } from "./snake-playtest-tuning";
export {
  getSnakeTelemetryHistory,
  getGlobalWorldTelemetrySummary,
  getPostDeathActionSummary,
  detectEnvironment,
  type SnakeTelemetrySession,
  type PostDeathAction,
} from "./snake-telemetry";
