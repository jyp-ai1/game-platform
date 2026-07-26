export { SnakeGame } from "./Snake";
export { SnakeIoGame } from "./SnakeIo";
export {
  buildPartyMemoryLines,
  loadSnakeDayMemory,
  recordSnakeSessionEnd,
  type MemoryLine,
  type SnakeDayMemory,
} from "./snake-session-recap";
export { GlobalWorldPersist, type GlobalWorldJoinBrief } from "./snake-global-world";
export { SnakeAiFillEngine, SNAKE_WORLD_TARGET, isBotSnake, type BotRole } from "./snake-ai-fill";
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
