"use client";

import type { Game } from "@game-platform/shared";
import { Button, Container, SectionTitle } from "@game-platform/ui";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { ContinuePlayingCard } from "@/components/continue-playing-card";
import { GameCard } from "@/components/game-card";
import { PlayerStats } from "@/components/player-stats";
import {
  getFavoritesSnapshot,
  getRecentlyPlayedSnapshot,
  getServerFavoritesSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeFavorites,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";

const COLLECTIONS = [
  { title: "퍼즐 팩", href: "/categories/puzzle", emoji: "🧩" },
  { title: "스포츠 팩", href: "/categories/sports", emoji: "🏅" },
  { title: "보드 팩", href: "/categories/board", emoji: "♟️" },
  { title: "두뇌 팩", href: "/categories/brain", emoji: "🧠" },
  { title: "5분 게임", href: "/games?preset=quick-play", emoji: "⚡" },
  { title: "주말 추천", href: "/games?preset=recommended", emoji: "🌟" },
];

export function JourneyHub({ games }: { games: Game[] }) {
  const recentSlugs = useSyncExternalStore(
    subscribeRecentlyPlayed,
    getRecentlyPlayedSnapshot,
    getServerRecentlyPlayedSnapshot
  );
  const favoriteSlugs = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot
  );

  const bySlug = new Map(games.map((g) => [g.slug, g]));
  const continueGames = recentSlugs
    .slice(0, 3)
    .map((s) => bySlug.get(s))
    .filter((g): g is Game => g !== undefined);
  const historyGames = recentSlugs
    .map((s) => bySlug.get(s))
    .filter((g): g is Game => g !== undefined);
  const favoriteGames = favoriteSlugs
    .map((s) => bySlug.get(s))
    .filter((g): g is Game => g !== undefined);

  return (
    <div className="flex flex-col gap-12">
      <section>
        <SectionTitle title="▶ Continue Playing" description="이어서 플레이할 게임" />
        {continueGames.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {continueGames.map((game) => (
              <ContinuePlayingCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            플레이 기록이 없습니다.{" "}
            <Link href="/games" className="font-medium text-primary underline">
              게임 탐색
            </Link>
          </div>
        )}
      </section>

      <section>
        <SectionTitle title="📚 Collections" description="테마별 게임 모음" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {COLLECTIONS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-xl border bg-card p-4 text-center transition-colors hover:border-primary/40"
            >
              <span className="text-2xl">{c.emoji}</span>
              <p className="mt-2 text-sm font-medium">{c.title}</p>
            </Link>
          ))}
        </div>
      </section>

      {favoriteGames.length > 0 ? (
        <section>
          <SectionTitle title="❤️ 즐겨찾기" description="저장한 게임" />
          <div className="scrollbar-hide mt-4 flex gap-4 overflow-x-auto pb-2">
            {favoriteGames.map((game) => (
              <div key={game.id} className="w-56 shrink-0">
                <GameCard game={game} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionTitle title="🕐 Play History" description="최근 플레이한 게임" />
        {historyGames.length > 0 ? (
          <div className="scrollbar-hide mt-4 flex gap-4 overflow-x-auto pb-2">
            {historyGames.map((game) => (
              <div key={game.id} className="w-56 shrink-0">
                <GameCard game={game} />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">아직 기록이 없습니다.</p>
        )}
      </section>

      <section>
        <SectionTitle title="📊 Statistics" description="내 플레이 통계" />
        <div className="mt-4">
          <PlayerStats games={games} />
        </div>
        <Button
          className="mt-4"
          variant="outline"
          nativeButton={false}
          render={<Link href="/profile">프로필에서 자세히 보기</Link>}
        />
      </section>
    </div>
  );
}
