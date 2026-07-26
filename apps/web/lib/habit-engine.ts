/**
 * Habit Engine — why return tomorrow (Replay OS v4).
 */
import { getDailyStreak, getTodayPlayCount } from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";

import { listChallenges } from "@/lib/challenge-scores-store";
import { buildReplayIdentityProfile } from "@/lib/replay-identity";
import {
  getTodayMissionProgress,
  isTodayMissionMixComplete,
} from "@/lib/universal-mission-engine";

export interface HabitState {
  streakDays: number;
  streakAtRisk: boolean;
  todayPlayed: boolean;
  possibleScoreGain: number;
  todayRewardCoins: number;
  missionsLeft: number;
  pendingChallenges: number;
  missionComplete: boolean;
  lossMessage: string | null;
  habitHeadline: string;
}

export function buildHabitState(games: Game[]): HabitState {
  const streak = getDailyStreak();
  const todayPlays = getTodayPlayCount();
  const mission = getTodayMissionProgress();
  const pending = listChallenges().filter((c) => c.status !== "complete");
  const identity = buildReplayIdentityProfile(games);
  const todayPlayed = todayPlays > 0 || identity.todayMinutes > 0;
  const streakAtRisk = streak.currentStreak > 0 && !todayPlayed;
  const missionComplete = isTodayMissionMixComplete();

  const possibleScoreGain = Math.max(25, Math.round(identity.replayScore * 0.02) + 15);
  const todayRewardCoins = missionComplete ? 0 : (mission.total - mission.done) * 25 + 50;

  let lossMessage: string | null = null;
  if (streakAtRisk) {
    lossMessage = `${streak.currentStreak}일 streak이 오늘 자정에 사라집니다`;
  } else if (!missionComplete) {
    lossMessage = `미완료 미션 ${mission.total - mission.done}개 · +${todayRewardCoins} Coin 놓침`;
  }

  let habitHeadline = "오늘 Replay Score를 쌓아보세요";
  if (pending.length > 0) {
    habitHeadline = `친구 ${pending.length}명이 기다리고 있습니다`;
  } else if (streakAtRisk) {
    habitHeadline = "오늘 Replay를 안 하면 streak을 잃어요";
  } else if (!missionComplete) {
    habitHeadline = `오늘 미션 ${mission.done}/${mission.total} — ${possibleScoreGain}점 더 가능`;
  } else if (todayPlayed) {
    habitHeadline = "오늘도 훌륭한 Replay였어요!";
  }

  return {
    streakDays: streak.currentStreak,
    streakAtRisk,
    todayPlayed,
    possibleScoreGain,
    todayRewardCoins,
    missionsLeft: mission.total - mission.done,
    pendingChallenges: pending.length,
    missionComplete,
    lossMessage,
    habitHeadline,
  };
}
