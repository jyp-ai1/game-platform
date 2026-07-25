"use client";

import type { Game } from "@game-platform/shared";
import { Coins, Sparkles, Target, Trophy, Users, ChevronRight } from "lucide-react";
import Link from "next/link";

import { getPlatformAchievementTitle } from "@/lib/achievement-engine";
import { getGenreCollections } from "@/lib/collection-engine";
import { getFriendBeatGap } from "@/lib/replay-identity";
import type { UniversalRewardBundle } from "@/lib/reward-engine";
import {
  getTodayMissionMix,
  getTodayMissionProgress,
} from "@/lib/universal-mission-engine";

export function GameResultReplayMoment({
  slug,
  score,
  rewards,
  games,
  recommend,
  level,
  levelXpGain,
  todayRank,
  top10Gap,
}: {
  slug: string;
  score: number;
  rewards: UniversalRewardBundle;
  games: Game[];
  recommend?: Game;
  level: number;
  levelXpGain: number;
  todayRank: number | null;
  top10Gap: number | null;
}) {
  const mission = getTodayMissionProgress();
  const mix = getTodayMissionMix();
  const nextMission = mix.find((m) => !m.done);
  const friend = getFriendBeatGap(slug, score);
  const game = games.find((g) => g.slug === slug);
  const genreSlug = game?.category?.slug ?? "casual";
  const genreCol = getGenreCollections(games).find((c) => c.genre === genreSlug);

  const moments = [
    {
      icon: Sparkles,
      text: `+${rewards.xpDisplay} XP`,
      sub: levelXpGain > 0 ? `Lv.${level} → Lv.${level + (levelXpGain > 100 ? 1 : 0)}` : `Lv.${level}`,
      color: "text-primary",
    },
    top10Gap !== null && top10Gap > 0
      ? {
          icon: Trophy,
          text: `TOP10까지 ${top10Gap.toLocaleString()}점`,
          sub: todayRank ? `현재 #${todayRank}` : "랭킹 진입 가능",
          color: "text-amber-400",
        }
      : todayRank !== null && todayRank <= 10
        ? {
            icon: Trophy,
            text: `오늘 TOP10 · #${todayRank}`,
            sub: "축하합니다!",
            color: "text-emerald-400",
          }
        : null,
    !mission.done || mission.total > 0
      ? {
          icon: Target,
          text: `오늘 미션 ${mission.done}/${mission.total}`,
          sub: nextMission?.label ?? "완료!",
          color: mission.done >= mission.total ? "text-emerald-400" : "text-primary",
        }
      : null,
    friend.gap !== 0
      ? {
          icon: Users,
          text:
            friend.gap > 0
              ? `친구 ${friend.nickname}보다 ${friend.gap.toLocaleString()}점 낮음`
              : `친구 ${friend.nickname}보다 +${Math.abs(friend.gap).toLocaleString()}점`,
          sub: friend.gap > 0 ? "한 판 더?" : "리드 중!",
          color: friend.gap > 0 ? "text-amber-400" : "text-emerald-400",
        }
      : null,
    rewards.newAchievements.length > 0
      ? {
          icon: Sparkles,
          text: "신규 업적",
          sub: rewards.newAchievements.map(getPlatformAchievementTitle).join(", "),
          color: "text-violet-400",
        }
      : null,
    genreCol
      ? {
          icon: Trophy,
          text: `${genreCol.label} Collection ${genreCol.percent}%`,
          sub: `${genreCol.completed}/${genreCol.total} games`,
          color: "text-primary",
        }
      : null,
    {
      icon: Coins,
      text: `+${rewards.coins} Coin · Replay +${rewards.replayScoreGain}`,
      sub: `Total Replay ${rewards.replayScoreTotal}`,
      color: "text-amber-400",
    },
  ].filter(Boolean) as Array<{
    icon: typeof Sparkles;
    text: string;
    sub: string;
    color: string;
  }>;

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/80 to-card/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Replay Moment</p>
        <ul className="mt-3 space-y-3">
          {moments.map((m) => (
            <li key={m.text} className="flex items-start gap-3 text-sm">
              <m.icon className={`mt-0.5 size-4 shrink-0 ${m.color}`} />
              <div className="min-w-0 flex-1">
                <p className={`font-semibold ${m.color}`}>{m.text}</p>
                <p className="text-xs text-muted-foreground">{m.sub}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {recommend ? (
        <Link
          href={`/games/${recommend.slug}`}
          className="flex items-center justify-between rounded-2xl border border-white/10 bg-muted/20 px-4 py-3 text-sm transition-colors hover:border-primary/40"
        >
          <span>
            다음 추천 · <span className="font-semibold">{recommend.title}</span>
          </span>
          <ChevronRight className="size-4 text-primary" />
        </Link>
      ) : null}
    </div>
  );
}
