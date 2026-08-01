"use client";

import type { Game } from "@game-platform/shared";
import { Button, cn } from "@game-platform/ui";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";

import { EmptyState } from "@/components/empty-state";
import { GameGrid } from "@/components/game-grid";
import {
  discoverGames,
  GAME_CATEGORY_FILTERS,
  GAME_SORT_OPTIONS,
  type GameCategoryFilter,
  type GameSortOption,
} from "@/lib/games-discovery";
import { selectHotSlugs, selectNew } from "@/lib/game-sections";
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
  getServerGamePlayCountsSnapshot,
  isDailyChallengeComplete,
  subscribeEngagement,
  subscribeMissions,
} from "@game-platform/game-sdk";
import { recommendGames, topRecommendationReason } from "@/lib/recommendation-engine";
import { buildWrappedSnapshot } from "@/lib/wrapped-data";
import { DiscoverChallengeStrip } from "@/components/discover-challenge-strip";
import { DiscoverSeasonStrip } from "@/components/discover-season-strip";
import { GameCard } from "@/components/game-card";
import { LIBRARY_COLLECTIONS } from "@/lib/library-store";
import { getOnlineFriends } from "@/lib/social-store";
import Link from "next/link";

type PlayerFilter = "all" | "solo" | "multiplayer";

const PLAYER_FILTERS: Array<{ value: PlayerFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "solo", label: "1 Player" },
  { value: "multiplayer", label: "Multiplayer" },
];

export function GamesDiscoveryBrowser({
  games,
  hotSlugs,
}: {
  games: Game[];
  hotSlugs?: Set<string>;
}) {
  const [category, setCategory] = useState<GameCategoryFilter>("all");
  const [sort, setSort] = useState<GameSortOption>("popular");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<"all" | "EASY" | "MEDIUM" | "HARD">("all");
  const [players, setPlayers] = useState<PlayerFilter>("all");

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
    getServerGamePlayCountsSnapshot
  );

  const resolvedHotSlugs = hotSlugs ?? selectHotSlugs(games);

  const activeFilterCount =
    (category !== "all" ? 1 : 0) +
    (difficulty !== "all" ? 1 : 0) +
    (players !== "all" ? 1 : 0) +
    (sort !== "popular" ? 1 : 0);

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
        query,
        "all",
        null,
        resolvedHotSlugs
      );
      if (difficulty !== "all") list = list.filter((g) => g.difficulty === difficulty);
      if (players === "multiplayer") list = list.filter((g) => g.slug === "snake");
      if (players === "solo") list = list.filter((g) => g.slug !== "snake");
      return list;
    },
    [games, category, sort, favorites, recentlyPlayed, query, resolvedHotSlugs, difficulty, players]
  );

  const continueGames = useMemo(() => {
    const bySlug = new Map(games.map((g) => [g.slug, g]));
    return recentlyPlayed
      .map((s) => bySlug.get(s))
      .filter((g): g is Game => g !== undefined)
      .slice(0, 4);
  }, [games, recentlyPlayed]);

  const recentlyUpdated = useMemo(() => selectNew(games, 6), [games]);
  const trending = useMemo(
    () => [...games].sort((a, b) => b.playCount - a.playCount).slice(0, 6),
    [games]
  );
  const friendsPlaying = getOnlineFriends();

  return (
    <div className="flex flex-col gap-6">
      <DiscoverChallengeStrip />
      <DiscoverSeasonStrip games={games} hotSlugs={resolvedHotSlugs} />

      <div className="flex flex-wrap gap-2">
        <Link href="/missions" className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium">
          Season Missions
        </Link>
        <Link href="/wrapped" className="rounded-xl border border-white/10 px-4 py-2 text-sm">
          Replay Wrapped
        </Link>
        <Link href="/ranking" className="rounded-xl border border-white/10 px-4 py-2 text-sm">
          Rankings
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {LIBRARY_COLLECTIONS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl border border-white/10 bg-card/60 p-3 text-center text-sm transition-colors hover:border-primary/30"
          >
            <span className="text-xl">{c.emoji}</span>
            <p className="mt-1 font-medium">{c.title}</p>
          </Link>
        ))}
      </div>

      {continueGames.length > 0 ? (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Continue</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {continueGames.map((game) => (
              <GameCard key={game.id} game={game} isHot={resolvedHotSlugs.has(game.slug)} />
            ))}
          </div>
        </section>
      ) : null}

      {friendsPlaying.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-card/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Friends Playing</p>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {friendsPlaying.map((f) => (
              <li key={f.id} className="rounded-full border border-white/10 px-3 py-1">
                {f.nickname} · online
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Trending</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trending.map((game) => (
            <GameCard key={game.id} game={game} isHot={resolvedHotSlugs.has(game.slug)} />
          ))}
        </div>
      </section>

      {recentlyUpdated.length > 0 ? (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recently Updated</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentlyUpdated.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      ) : null}

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

      <section className="flex flex-col gap-4" aria-labelledby="discover-heading">
        <div>
          <h2 id="discover-heading" className="text-lg font-semibold">
            Discover
          </h2>
          <p className="text-sm text-muted-foreground">{visible.length}개 게임</p>
        </div>

        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="게임 검색"
            className="h-11 w-full rounded-xl border border-white/10 bg-card/60 pl-10 pr-4 text-sm outline-none ring-primary/30 transition focus:ring-2"
            aria-label="Search games"
          />
        </label>

        <div className="rounded-xl border border-white/10 bg-card/40">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-muted-foreground" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                  {activeFilterCount}
                </span>
              ) : null}
            </span>
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                filtersOpen && "rotate-180"
              )}
            />
          </button>

          {filtersOpen ? (
            <div className="space-y-5 border-t border-white/10 px-4 py-4">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Genre
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

              <div className="space-y-2">
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

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Players
                </p>
                <div className="flex flex-wrap gap-2">
                  {PLAYER_FILTERS.map((item) => (
                    <Button
                      key={item.value}
                      type="button"
                      size="sm"
                      variant={players === item.value ? "default" : "outline"}
                      onClick={() => setPlayers(item.value)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Sort
                </p>
                <div className="flex flex-wrap gap-2">
                  {GAME_SORT_OPTIONS.map((item) => (
                    <Button
                      key={item.value}
                      type="button"
                      size="sm"
                      variant={sort === item.value ? "secondary" : "outline"}
                      className={cn(sort === item.value && "ring-1 ring-border")}
                      onClick={() => setSort(item.value)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {visible.length === 0 ? (
        <EmptyState message="조건에 맞는 게임이 없습니다." />
      ) : (
        <GameGrid games={visible} hotSlugs={resolvedHotSlugs} />
      )}
    </div>
  );
}
