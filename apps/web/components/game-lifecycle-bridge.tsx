"use client";

import {
  getLevelProgress,
  getServerLevelProgressSnapshot,
  subscribeEngagement,
  subscribePlatformAnalyticsEvents,
} from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import { Coins, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { getGameFramework } from "@/lib/game-framework";
import { getRuntimeConfig } from "@/lib/game-runtime-config";
import { getCurrentStage, getNextStage, getStageProgress } from "@/lib/game-stages";
import { markCompleted } from "@/lib/library-store";
import { selectRecommended } from "@/lib/game-sections";
import type { GameEndRewards } from "@/lib/retention-engine";
import {
  getFavoritesSnapshot,
  getRecentlyPlayedSnapshot,
  getServerFavoritesSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeFavorites,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";

export function GameLifecycleBridge({
  slug,
  games,
  children,
}: {
  slug: string;
  games: Game[];
  children: React.ReactNode;
}) {
  const [result, setResult] = useState<{ score: number; rewards: GameEndRewards } | null>(null);

  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot
  );
  const recent = useSyncExternalStore(
    subscribeRecentlyPlayed,
    getRecentlyPlayedSnapshot,
    getServerRecentlyPlayedSnapshot
  );
  const level = useSyncExternalStore(
    subscribeEngagement,
    getLevelProgress,
    getServerLevelProgressSnapshot
  );

  useEffect(() => {
    const framework = getGameFramework(slug);
    return subscribePlatformAnalyticsEvents((event) => {
      if (event.type === "game-end" && event.gameSlug === slug) {
        const rewards = framework.onGameEnd(event.score);
        setResult({ score: event.score, rewards });
      }
    });
  }, [slug]);

  const recommend =
    selectRecommended(games, recent, favorites, 1)[0] ?? games.find((g) => g.slug !== slug);

  if (!result) return <>{children}</>;

  const stage = getCurrentStage(slug, result.score);
  const nextStage = getNextStage(slug, result.score);
  const progress = getStageProgress(slug, result.score);
  const { rewards } = result;
  const runtime = getRuntimeConfig(slug);
  const bossBeat = result.score >= runtime.boss.threshold;

  if (bossBeat) markCompleted(slug);

  return (
    <>
      {children}
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 rounded-3xl border border-primary/30 bg-card p-6 shadow-2xl">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">Result</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{result.score.toLocaleString()}</p>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
            <div className="rounded-xl bg-primary/10 px-2 py-3">
              <p className="font-bold text-primary">+{rewards.xpDisplay}</p>
              <p className="text-xs text-muted-foreground">XP</p>
            </div>
            <div className="rounded-xl bg-amber-500/10 px-2 py-3">
              <p className="flex items-center justify-center gap-1 font-bold text-amber-400">
                <Coins className="size-3" />+{rewards.coins}
              </p>
              <p className="text-xs text-muted-foreground">Coin</p>
            </div>
            <div className="rounded-xl bg-muted/50 px-2 py-3">
              <p className="font-bold">{stage.label}</p>
              <p className="text-xs text-muted-foreground">Stage</p>
            </div>
            <div className="rounded-xl bg-muted/50 px-2 py-3">
              <p className="font-bold">Lv.{level.level}</p>
              <p className="text-xs text-muted-foreground">Level</p>
            </div>
          </div>

          {bossBeat ? (
            <p className="mt-3 text-center text-sm font-bold text-amber-400">
              Boss Defeated: {runtime.boss.name}! +{runtime.boss.rewardCoins} bonus
            </p>
          ) : null}

          {rewards.isNewBest ? (
            <p className="mt-3 flex items-center justify-center gap-1 text-sm font-medium text-emerald-400">
              <Trophy className="size-4" /> New Best!
            </p>
          ) : null}

          {nextStage ? (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Sparkles className="size-3" />
                  Next Goal: {nextStage.label}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <Button nativeButton={false} render={<Link href={`/games/${slug}`}>Retry</Link>} />
            {recommend ? (
              <Button
                variant="secondary"
                nativeButton={false}
                render={<Link href={`/games/${recommend.slug}`}>Next · {recommend.title}</Link>}
              />
            ) : null}
            <Button variant="outline" nativeButton={false} render={<Link href="/">Continue</Link>} />
          </div>

          <button
            type="button"
            className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setResult(null)}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
