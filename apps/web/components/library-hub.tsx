"use client";

import type { Game } from "@game-platform/shared";
import { Badge, SectionTitle } from "@game-platform/ui";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import { GameCard } from "@/components/game-card";
import { LibraryAnalyticsPanel } from "@/components/library-analytics-panel";
import { getLibraryShelves, LIBRARY_COLLECTIONS, type LibraryShelf } from "@/lib/library-store";
import { subscribeLiveData } from "@/lib/live-data-bus";

export function LibraryHub({ games }: { games: Game[] }) {
  const tick = useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  const shelves = useMemo(() => getLibraryShelves(), [tick]);
  const [active, setActive] = useState<LibraryShelf>("recent");
  const bySlug = new Map(games.map((g) => [g.slug, g]));

  const current = shelves.find((s) => s.id === active) ?? shelves[0];
  const shelfGames = current.slugs
    .map((s) => bySlug.get(s))
    .filter((g): g is Game => g !== undefined);

  return (
    <div className="flex flex-col gap-10">
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/90 to-card p-6 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Steam Library</p>
        <h2 className="mt-1 text-2xl font-bold">Your Game Collection</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Recently played, favorites, completed, wishlist — all in one place.
        </p>
      </div>

      <LibraryAnalyticsPanel games={games} />

      <div className="flex flex-wrap gap-2">
        {shelves.map((shelf) => (
          <button
            key={shelf.id}
            type="button"
            onClick={() => setActive(shelf.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all ${
              active === shelf.id
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "border border-white/10 bg-card/60 hover:border-primary/30"
            }`}
          >
            <span>{shelf.emoji}</span>
            {shelf.label}
            <Badge variant="outline" className="ml-1 text-[10px]">
              {shelf.slugs.length}
            </Badge>
          </button>
        ))}
      </div>

      <section>
        <SectionTitle title={`${current.emoji} ${current.label}`} description={`${shelfGames.length} games`} />
        {shelfGames.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shelfGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
            No games yet.{" "}
            <Link href="/games" className="font-medium text-primary underline">
              Discover games
            </Link>
          </div>
        )}
      </section>

      <section>
        <SectionTitle title="Collections" description="Curated packs" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {LIBRARY_COLLECTIONS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-xl border bg-card/60 p-4 text-center transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
            >
              <span className="text-2xl">{c.emoji}</span>
              <p className="mt-2 text-sm font-medium">{c.title}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-muted/20 p-4 text-center text-sm text-muted-foreground">
        <span className="text-foreground">Downloads</span> — Install PWA for offline play (coming soon)
      </section>
    </div>
  );
}
