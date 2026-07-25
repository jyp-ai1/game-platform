"use client";

import type { Game } from "@game-platform/shared";
import {
  CURRENT_SEASON,
  getSeasonBadge,
  getSeasonProgress,
  getServerSeasonProgressSnapshot,
  subscribeSeason,
} from "@game-platform/game-sdk";
import { Progress } from "@game-platform/ui";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { GameCard } from "@/components/game-card";
import { useMounted } from "@/lib/use-mounted";

/** Season browse — featured games + pass progress on Discover. */
export function DiscoverSeasonStrip({
  games,
  hotSlugs,
}: {
  games: Game[];
  hotSlugs?: Set<string>;
}) {
  const mounted = useMounted();
  const progress = useSyncExternalStore(
    subscribeSeason,
    getSeasonProgress,
    getServerSeasonProgressSnapshot
  );

  const featured = useMemo(
    () =>
      [...games]
        .filter((g) => g.status === "ACTIVE")
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 4),
    [games]
  );

  if (!mounted) return null;

  const badge = getSeasonBadge(progress.level);

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-card/60 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Season Browse
          </p>
          <p className="mt-1 text-lg font-bold">🏅 {CURRENT_SEASON.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Lv.{progress.level}
            {badge ? ` · ${badge.name}` : ""} · {progress.xpIntoLevel}/{progress.xpNeededForLevel} XP
          </p>
          <Progress value={progress.percent} label="Season pass progress" className="mt-3 max-w-xs" />
        </div>
        <Link
          href="/missions"
          className="shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium hover:bg-amber-500/20"
        >
          Season Missions →
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((game) => (
          <GameCard key={game.id} game={game} isHot={hotSlugs?.has(game.slug)} />
        ))}
      </div>
    </section>
  );
}
