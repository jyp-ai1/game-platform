export {
  configurePlatformFlags,
  getPlatformFlags,
  isRankingEnabled,
  isSaveEnabled,
  isWeeklyMissionEnabled,
  type PlatformFlags,
} from "./platform-flags";
export {
  GameSDKProvider,
  useGameSDK,
  type GameSDKAdapter,
  type GameSDKApi,
} from "./context";
export {
  getBestScore,
  getDeviceId,
  getLastNickname,
  getServerBestScoreSnapshot,
  getServerNicknameSnapshot,
  getServerSoundEnabledSnapshot,
  isSoundEnabled,
  setLastNickname,
  setBestScore,
  setSoundEnabled,
  subscribeBestScore,
  subscribeNickname,
  subscribeSoundEnabled,
} from "./local-storage";
export {
  playClickSound,
  playComboSound,
  playCorrectSound,
  playExplosionSound,
  playFlagSound,
  playFlipSound,
  playGoalSound,
  playLineClearSound,
  playMergeSound,
  playFailSound,
  playGameOverSound,
  playHoverSound,
  playPopSound,
  playStageClearSound,
  playStartSound,
  playSuccessSound,
} from "./sound";
export {
  createEffectBurst,
  tickEffects,
  triggerEffect,
  triggerScreenShake,
  type EffectBurst,
  type EffectKind,
} from "./effects";
export {
  createStageManager,
  StageManager,
  type StageDefinition,
  type StageManagerOptions,
} from "./stage-manager";
export {
  GAME_RULE_GROUPS,
  getAllGroupedSlugs,
  getGameRuleGroup,
  getGroupSlugs,
  type GameRuleGroup,
  type GameRuleGroupDef,
} from "./game-rule-groups";
export { GameSlugProvider, useGameSlug } from "./game-slug-context";
export { InstantPlayProvider, useInstantPlay } from "./instant-play-context";
export { FrameworkResultOverlay, type FrameworkResultOverlayProps } from "./framework-overlays";
export {
  useGameFramework,
  type GameFrameworkResultFlow,
  type UseGameFrameworkOptions,
  type UseGameFrameworkResult,
} from "./use-game-framework";
export {
  endTrackedSession,
  getTrackedSession,
  resetTrackedSession,
  startTrackedSession,
  updateTrackedScore,
} from "./session-tracker";
export { useStandardGameFeel, standardFeelFromState, feelWithScore, type StandardGameFeelOptions } from "./use-standard-game-feel";
export { StandardGameOverOverlay } from "./standard-game-over-overlay";
export { StandardGameShell } from "./standard-game-shell";

export {
  enterViewportFullscreen,
  exitViewportFullscreen,
  getActiveFullscreenElement,
  isViewportFullscreen,
} from "./multiplayer-fullscreen";
export {
  DEFAULT_MP_AI_DIFFICULTY,
  MP_AI_DIFFICULTIES,
  toEngineAiTier,
  type EngineAiTier,
  type MpAiDifficulty,
} from "./mp-difficulty";
export {
  MP_PLAYER_COLORS,
  MultiplayerEntrySelect,
  type MpStyleOption,
} from "./multiplayer-entry-select";
export {
  buildCreatorGameMeta,
  getCreatorMultiplayerSlugs,
  isMultiplayerGameSlug,
  resolveGameType,
  setCreatorMultiplayerSlugs,
  toSessionDifficulty,
  type CreatorGameMeta,
  type GameType,
  type SessionDifficulty,
} from "./game-metadata";
export {
  PLATFORM_CONTRACT_CHECKLIST_KEYS,
  PLATFORM_FLAGSHIP_MP_SLUGS,
  PLATFORM_JOURNEY,
  assertEntryLobbyContract,
  buildPlatformGameContract,
  entryStepsForMode,
  flagshipMpContractSmoke,
  resolveEntryMode,
  type PlatformContractChecklist,
  type PlatformEntryMode,
  type PlatformEntrySteps,
  type PlatformGameContractMeta,
  type PlatformJourneyStep,
} from "./platform-game-contract";
export {
  MultiplayerDeathOverlay,
  MultiplayerMinimap,
  MultiplayerPlayShell,
  MultiplayerSideRankHud,
  MultiplayerYouBar,
  type MpMinimapDot,
} from "./multiplayer-play-shell";
export {
  MobileControlPad,
  type MobileControlAction,
  type MobileControlPadProps,
  type PadDirection,
} from "./mobile-control-pad";
export { GameFeelLayer } from "./game-feel-layer";
export { playGameFeel, type GameFeelEvent } from "./game-feel-events";
export { PuzzlePlayField } from "./puzzle-play-field";
export { getPuzzleStage, type PuzzleStageParams } from "./puzzle-stage-config";
export { getGroupDifficulty, type GroupDifficulty } from "./game-difficulty";
export {
  DIFFICULTY_STAGE,
  humanVsCpuStatus,
  pickCpuMove,
  type BoardGameStatus,
  type CpuDifficulty,
} from "./board-game-status";
export { CpuDifficultyPicker } from "./cpu-difficulty-picker";
export { useHumanVsCpuFeel } from "./use-human-vs-cpu-feel";
export {
  ACHIEVEMENTS,
  getAchievementRate,
  getAchievements,
  getCategoryPlayCounts,
  getDailyStreak,
  getGamePlayCounts,
  getServerGamePlayCountsSnapshot,
  getLevel,
  getLevelProgress,
  getMostPlayedGameSlug,
  getServerAchievementsSnapshot,
  getServerDailyStreakSnapshot,
  getServerLevelProgressSnapshot,
  getServerLevelSnapshot,
  getServerTodayPlayCountSnapshot,
  getServerTotalPlayCountSnapshot,
  getServerXPSnapshot,
  getTodayPlayCount,
  getTotalPlayCount,
  getXP,
  isAchievementUnlocked,
  levelForXp,
  recordNewBest,
  recordRankingSubmitted,
  recordScoreReport,
  recordSessionStart,
  subscribeEngagement,
  xpForLevel,
  type AchievementDefinition,
  type AchievementId,
  type AchievementsState,
  type DailyStreakState,
  type LevelProgress,
} from "./engagement";
export {
  emitEngagementEvent,
  subscribeEngagementEvents,
  type EngagementEvent,
} from "./engagement-events";
export {
  getDailyMission,
  getMissionDefinition,
  getMissionTierForLevel,
  getServerDailyMissionSnapshot,
  isDailyChallengeComplete,
  recordMissionScoreReport,
  recordMissionSessionStart,
  subscribeMissions,
  type DailyMissionState,
  type MissionCheckContext,
  type MissionDefinition,
  type MissionHook,
  type MissionProgress,
  type MissionTier,
  type MissionType,
} from "./missions";
export {
  clearSave,
  getSaveUpdatedAt,
  getServerHasSaveSnapshot,
  hasSave,
  loadGame,
  saveGame,
  SAVE_VERSION,
  subscribeSave,
  type SaveEnvelope,
} from "./save";
export {
  clearGameProgress,
  getOperationalMetrics,
  loadGameProgress,
  recordGameCrash,
  recordGameEnd,
  recordGameRetry,
  recordGameRunEnd,
  recordGameRunStart,
  recordStageClear,
  saveGameProgress,
  type GameProgressStats,
  type OperationalMetrics,
} from "./game-progress";
export {
  BATCH_1_SLUGS,
  BATCH_2_SLUGS,
  GAME_STANDARD_REGISTRY,
  getBatchSlugs,
  getGameStandard,
  type GameOutcome,
  type GameRuleTaxonomy,
  type GameStandardCapabilities,
  type GameStandardDefinition,
  type GameStandardPhase,
} from "./game-standard";
export { createGameSession, type GameEndPayload, type GameSession } from "./game-session";
export { useGameSession, type UseGameSessionResult } from "./use-game-session";
export { useAutoSave, type SaveIndicatorStatus } from "./use-auto-save";
export { useReadyCountdown, type UseReadyCountdownResult } from "./use-ready-countdown";
export { emitGameRetry } from "./game-retry";
export { emitGameExit } from "./game-exit";
export {
  useResumableGame,
  type ResumePhase,
  type UseResumableGameResult,
} from "./use-resumable-game";
export { ResumeDialog } from "./resume-dialog";
export { SaveIndicator } from "./save-indicator";
export {
  CURRENT_SEASON,
  getSeasonBadge,
  getSeasonLevel,
  getSeasonProgress,
  getSeasonXP,
  getServerSeasonLevelSnapshot,
  getServerSeasonProgressSnapshot,
  getServerSeasonXPSnapshot,
  recordSeasonNewBest,
  recordSeasonScoreReport,
  recordSeasonSessionStart,
  subscribeSeason,
  type SeasonBadgeTier,
} from "./season";
export { claimDailyReward, hasClaimedTodayReward } from "./daily-reward";
export {
  emitPlatformAnalyticsEvent,
  subscribePlatformAnalyticsEvents,
  type PlatformAnalyticsEvent,
} from "./platform-analytics";
export {
  getServerWeeklyMissionSnapshot,
  getWeeklyMission,
  getWeeklyMissionDefinition,
  isWeeklyMissionComplete,
  isoWeekString,
  recordWeeklyMissionScoreReport,
  recordWeeklyMissionSessionStart,
  subscribeWeeklyMission,
  type WeeklyMissionState,
} from "./weekly-missions";
