"use client";

import type { Game } from "@game-platform/shared";
import { Container } from "@game-platform/ui";
import Image from "next/image";
import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { useSyncExternalStore } from "react";

import { getCompleted } from "@/lib/library-store";
import { subscribeLiveData } from "@/lib/live-data-bus";

export function HomeCollectionStrip({ games }: { games: Game[] }) {
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  const completed = getCompleted().slice(0, 6);
  const bySlug = new Map(games.map((g) => [g.slug, g]));
  const items = completed
    .map((slug) => bySlug.get(slug))
    .filter((g): g is Game => g !== undefined);

  if (items.length === 0) return null;

  return (
    <section className="py-4 sm:py-6">
      <Container>
        <div className="flex items-end justify-between">
          <h2 className="text-base font-semibold sm:text-lg">Collection</h2>
          <Link href="/library" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {items.map((game) => (
            <Link
              key={game.id}
              href={`/games/${game.slug}`}
              className="group relative size-20 shrink-0 overflow-hidden rounded-xl border border-white/10 sm:size-24"
            >
              {game.thumbnailUrl ? (
                <Image src={game.thumbnailUrl} alt={game.title} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-muted">
                  <Gamepad2 className="size-6 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-1">
                <p className="truncate text-[10px] font-medium">{game.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
