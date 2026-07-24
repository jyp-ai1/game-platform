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
  getServerNicknameSnapshot,
  getServerSoundEnabledSnapshot,
  isSoundEnabled,
  setLastNickname,
  setSoundEnabled,
  subscribeNickname,
  subscribeSoundEnabled,
} from "./local-storage";
export { playClickSound, playHoverSound, playStartSound } from "./sound";
export {
  ACHIEVEMENTS,
  getAchievementRate,
  getAchievements,
  getCategoryPlayCounts,
  getDailyStreak,
  getGamePlayCounts,
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
export { useAutoSave, type SaveIndicatorStatus } from "./use-auto-save";
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
