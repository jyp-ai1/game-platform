"use client";

import type { Game } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { GameCard } from "@/components/game-card";
import {
  getRecentlyPlayedSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";

export function ProfileRecentGames({ games }: { games: Game[] }) {
  const slugs = useSyncExternalStore(
    subscribeRecentlyPlayed,
    getRecentlyPlayedSnapshot,
    getServerRecentlyPlayedSnapshot
  );

  const bySlug = new Map(games.map((g) => [g.slug, g]));
  const recent = slugs
    .slice(0, 6)
    .map((s) => bySlug.get(s))
    .filter((g): g is Game => g !== undefined);

  if (recent.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        아직 플레이 기록이 없습니다.{" "}
        <Link href="/games" className="text-primary underline">
          첫 게임 시작
        </Link>
      </p>
    );
  }

  return (
    <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2">
      {recent.map((game) => (
        <div key={game.id} className="w-48 shrink-0 sm:w-52">
          <GameCard game={game} />
        </div>
      ))}
    </div>
  );
}

export function ProfileQuickLinks() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/journey">Journey</Link>} />
      <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/favorites">Favorites</Link>} />
      <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/community">Community</Link>} />
    </div>
  );
}
