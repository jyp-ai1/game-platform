"use client";

import type { Game } from "@game-platform/shared";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import {
  getFavoritesSnapshot,
  getServerFavoritesSnapshot,
  subscribeFavorites,
} from "@/lib/local-storage";

export function ProfileCollections({ games }: { games: Game[] }) {
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot
  );
  const bySlug = new Map(games.map((g) => [g.slug, g]));
  const collection = favorites
    .map((slug) => bySlug.get(slug))
    .filter((g): g is Game => g !== undefined);

  return (
    <section>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Collection</h3>
        <Link href="/favorites" className="text-xs text-primary hover:underline">
          All →
        </Link>
      </div>
      {collection.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          —
        </p>
      ) : (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {collection.map((game) => (
            <Link
              key={game.slug}
              href={`/games/${game.slug}`}
              className="shrink-0 rounded-2xl border border-white/10 bg-card/50 px-4 py-3 backdrop-blur transition-colors hover:border-primary/30"
            >
              <p className="text-sm font-medium">{game.title}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
