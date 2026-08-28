"use client";

/**
 * Sprint 20 — MY PAGE: recent plays, best score/length, play count, last played, favorites.
 */
import type { Game } from "@game-platform/shared";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { detailHrefForCatalogSlug } from "@/lib/game-catalog";
import {
  getFavoritesSnapshot,
  getRecentlyPlayedSnapshot,
  getServerFavoritesSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeFavorites,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";
import { buildMyPageSnapshot, type PlayerGameStat } from "@/lib/player-game-stats";
import {
  getGamePlayCounts,
  getServerGamePlayCountsSnapshot,
  subscribeEngagement,
} from "@game-platform/game-sdk";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function StatRow({ stat }: { stat: PlayerGameStat }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-card/40 px-3 py-2 text-sm">
      <div className="min-w-0">
        <Link
          href={detailHrefForCatalogSlug(stat.slug)}
          className="font-medium hover:underline"
        >
          {stat.title}
        </Link>
        <p className="text-[11px] text-muted-foreground">
          plays {stat.playCount} · best {stat.bestScore.toLocaleString()}
          {stat.bestLength !== stat.bestScore
            ? ` · length ${stat.bestLength.toLocaleString()}`
            : ""}
          {" · "}
          last {formatWhen(stat.lastPlayedAt)}
          {stat.favorite ? " · ★" : ""}
        </p>
      </div>
      <Link
        href={detailHrefForCatalogSlug(stat.slug)}
        className="shrink-0 text-xs text-primary hover:underline"
      >
        Re:Play
      </Link>
    </li>
  );
}

export function MyPageHistoryPanel({ games }: { games: Game[] }) {
  useSyncExternalStore(subscribeRecentlyPlayed, getRecentlyPlayedSnapshot, getServerRecentlyPlayedSnapshot);
  useSyncExternalStore(subscribeFavorites, getFavoritesSnapshot, getServerFavoritesSnapshot);
  useSyncExternalStore(subscribeEngagement, getGamePlayCounts, getServerGamePlayCountsSnapshot);

  const snap = useMemo(() => buildMyPageSnapshot(games), [games]);

  return (
    <section className="space-y-6" data-testid="my-page-history">
      <div>
        <h3 className="text-lg font-semibold">Recent plays</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Local session history — seeds future TOP10 / Popular / Recent
        </p>
        {snap.recentPlays.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {snap.recentPlays.slice(0, 8).map((s) => (
              <StatRow key={s.slug} stat={s} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">아직 플레이 기록이 없습니다.</p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold">Favorites</h3>
        {snap.favorites.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {snap.favorites.slice(0, 8).map((s) => (
              <StatRow key={s.slug} stat={s} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">즐겨찾기한 게임이 없습니다.</p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold">All played</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Per-game best score · play count · last played
        </p>
        {snap.allPlayed.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {snap.allPlayed.slice(0, 12).map((s) => (
              <StatRow key={s.slug} stat={s} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">기록이 쌓이면 여기에 표시됩니다.</p>
        )}
      </div>
    </section>
  );
}
