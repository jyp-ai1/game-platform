"use client";

import type { Game } from "@game-platform/shared";
import { Button, cn } from "@game-platform/ui";
import { useMemo, useState, useSyncExternalStore } from "react";

import { EmptyState } from "@/components/empty-state";
import { GameGrid } from "@/components/game-grid";
import {
  discoverGames,
  DISCOVERY_PRESETS,
  GAME_CATEGORY_FILTERS,
  GAME_SORT_OPTIONS,
  GAME_VIEW_FILTERS,
  presetDefaultSort,
  type DiscoveryPreset,
  type GameCategoryFilter,
  type GameSortOption,
  type GameViewFilter,
} from "@/lib/games-discovery";
import { selectHotSlugs } from "@/lib/game-sections";
import {
  getFavoritesSnapshot,
  getRecentlyPlayedSnapshot,
  getServerFavoritesSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeFavorites,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";
import {
  getDailyMission,
  getDailyStreak,
  getGamePlayCounts,
  getServerDailyMissionSnapshot,
  getServerDailyStreakSnapshot,
  isDailyChallengeComplete,
  subscribeEngagement,
  subscribeMissions,
} from "@game-platform/game-sdk";
import { recommendGames, topRecommendationReason } from "@/lib/recommendation-engine";
import { buildWrappedSnapshot } from "@/lib/wrapped-data";
import { GameCard } from "@/components/game-card";

export function GamesDiscoveryBrowser({
  games,
  hotSlugs,
}: {
  games: Game[];
  hotSlugs?: Set<string>;
}) {
  const [category, setCategory] = useState<GameCategoryFilter>("all");
  const [view, setView] = useState<GameViewFilter>("all");
  const [sort, setSort] = useState<GameSortOption>("popular");
  const [preset, setPreset] = useState<DiscoveryPreset | null>(null);
  const [mood, setMood] = useState<"all" | "chill" | "intense" | "quick">("all");
  const [difficulty, setDifficulty] = useState<"all" | "EASY" | "MEDIUM" | "HARD">("all");
  const [tag, setTag] = useState<string>("all");

  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot
  );
  const recentlyPlayed = useSyncExternalStore(
    subscribeRecentlyPlayed,
    getRecentlyPlayedSnapshot,
    getServerRecentlyPlayedSnapshot
  );
  const streak = useSyncExternalStore(
    subscribeEngagement,
    getDailyStreak,
    getServerDailyStreakSnapshot
  );
  const mission = useSyncExternalStore(
    subscribeMissions,
    getDailyMission,
    getServerDailyMissionSnapshot
  );
  const playCounts = useSyncExternalStore(
    subscribeEngagement,
    getGamePlayCounts,
    () => ({})
  );

  const resolvedHotSlugs = hotSlugs ?? selectHotSlugs(games);

  const popularTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of games) {
      for (const t of g.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([t]) => t);
  }, [games]);

  const aiPicks = useMemo(
    () =>
      recommendGames(
        games,
        {
          recentlyPlayed,
          favorites,
          streak: streak.currentStreak,
          missionIncomplete: !isDailyChallengeComplete(mission),
          replayScore: buildWrappedSnapshot(games).replayScore,
          playCounts,
        },
        4
      ),
    [games, recentlyPlayed, favorites, streak, mission, playCounts]
  );

  const aiReason = useMemo(
    () =>
      topRecommendationReason(games, {
        recentlyPlayed,
        favorites,
        streak: streak.currentStreak,
        missionIncomplete: !isDailyChallengeComplete(mission),
        replayScore: buildWrappedSnapshot(games).replayScore,
        playCounts,
      }),
    [games, recentlyPlayed, favorites, streak, mission, playCounts]
  );

  const visible = useMemo(
    () => {
      let list = discoverGames(
        games,
        category,
        sort,
        favorites,
        recentlyPlayed,
        "",
        view,
        preset,
        resolvedHotSlugs
      );
      if (mood === "chill") list = list.filter((g) => g.difficulty === "EASY");
      if (mood === "intense") list = list.filter((g) => g.difficulty === "HARD");
      if (mood === "quick") {
        list = list.filter(
          (g) => g.category?.slug === "casual" || g.category?.slug === "puzzle"
        );
      }
      if (difficulty !== "all") list = list.filter((g) => g.difficulty === difficulty);
      if (tag !== "all") list = list.filter((g) => g.tags.includes(tag));
      return list;
    },
    [
      games,
      category,
      sort,
      favorites,
      recentlyPlayed,
      view,
      preset,
      resolvedHotSlugs,
      mood,
      difficulty,
      tag,
    ]
  );

  function selectPreset(next: DiscoveryPreset) {
    setPreset(next);
    setSort(presetDefaultSort(next));
    if (next === "new") {
      setCategory("new");
    } else if (category === "new") {
      setCategory("all");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {aiPicks.length > 0 ? (
        <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-card/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            AI Picks · {aiReason}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {aiPicks.map((game) => (
              <GameCard key={game.id} game={game} isHot={resolvedHotSlugs.has(game.slug)} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Discover
        </p>
        <div className="flex flex-wrap gap-2">
          {DISCOVERY_PRESETS.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={preset === item.value ? "default" : "outline"}
              onClick={() => selectPreset(item.value)}
            >
              {item.label}
            </Button>
          ))}
          {preset ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setPreset(null);
                setCategory("all");
                setSort("popular");
              }}
            >
              Clear preset
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mood</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "all", label: "All" },
              { value: "chill", label: "Chill 🧘" },
              { value: "intense", label: "Intense 🔥" },
              { value: "quick", label: "5 Min ⚡" },
            ] as const
          ).map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={mood === item.value ? "default" : "outline"}
              onClick={() => setMood(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          View
        </p>
        <div className="flex flex-wrap gap-2">
          {GAME_VIEW_FILTERS.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={view === item.value ? "default" : "outline"}
              onClick={() => setView(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Category
        </p>
        <div className="flex flex-wrap gap-2">
          {GAME_CATEGORY_FILTERS.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={category === item.value ? "default" : "outline"}
              onClick={() => setCategory(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Difficulty
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "all", label: "All" },
              { value: "EASY", label: "Easy" },
              { value: "MEDIUM", label: "Medium" },
              { value: "HARD", label: "Hard" },
            ] as const
          ).map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={difficulty === item.value ? "default" : "outline"}
              onClick={() => setDifficulty(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {popularTags.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={tag === "all" ? "default" : "outline"}
              onClick={() => setTag("all")}
            >
              All
            </Button>
            {popularTags.map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={tag === t ? "default" : "outline"}
                onClick={() => setTag(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {visible.length}개 게임
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Sort</span>
          {GAME_SORT_OPTIONS.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={sort === item.value ? "secondary" : "ghost"}
              className={cn(sort === item.value && "ring-1 ring-border")}
              onClick={() => setSort(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState message="조건에 맞는 게임이 없습니다." />
      ) : (
        <GameGrid games={visible} hotSlugs={resolvedHotSlugs} />
      )}
    </div>
  );
}
