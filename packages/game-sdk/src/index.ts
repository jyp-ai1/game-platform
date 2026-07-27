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
  playFailSound,
  playGameOverSound,
  playHoverSound,
  playPopSound,
  playStartSound,
  playSuccessSound,
} from "./sound";
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
