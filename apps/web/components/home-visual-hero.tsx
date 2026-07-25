"use client";

import type { Game } from "@game-platform/shared";
import { Container } from "@game-platform/ui";
import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import {
  getRecentlyPlayedSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";

export function HomeVisualHero({ floatGames }: { floatGames: Game[] }) {
  const recentSlugs = useSyncExternalStore(
    subscribeRecentlyPlayed,
    getRecentlyPlayedSnapshot,
    getServerRecentlyPlayedSnapshot
  );
  const heroGame =
    floatGames.find((g) => recentSlugs.includes(g.slug)) ?? floatGames[0];
  const continueHref =
    recentSlugs.length > 0 ? `/games/${recentSlugs[0]}` : heroGame ? `/games/${heroGame.slug}` : "/games";

  return (
    <section className="relative min-h-[140px] overflow-hidden sm:min-h-[180px] lg:min-h-[220px]">
      {heroGame?.thumbnailUrl ? (
        <Image
          src={heroGame.thumbnailUrl}
          alt=""
          fill
          className="object-cover opacity-40"
          priority
        />
      ) : null}
      <div className="hero-pixel-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-brand-amber/10" />

      {floatGames.slice(0, 4).map((game, i) => (
        <Link
          key={game.slug}
          href={`/games/${game.slug}`}
          className="hero-float-card absolute overflow-hidden rounded-2xl border border-white/20 bg-card/30 shadow-2xl backdrop-blur-md transition-transform hover:scale-105"
          style={{
            width: 72 + i * 12,
            height: 48 + i * 8,
            top: `${10 + i * 8}%`,
            right: `${4 + i * 10}%`,
            transform: `rotate(${-8 + i * 5}deg)`,
            animationDelay: `${i * 0.5}s`,
            zIndex: 10 - i,
          }}
        >
          {game.thumbnailUrl ? (
            <Image src={game.thumbnailUrl} alt={game.title} fill className="object-cover" />
          ) : null}
        </Link>
      ))}

      <Container className="relative flex min-h-[140px] items-end justify-end py-4 sm:min-h-[180px] lg:min-h-[220px]">
        <Link
          href={continueHref}
          className="rounded-2xl bg-primary/90 px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 backdrop-blur transition-transform hover:scale-[1.02]"
        >
          ▶ Continue
        </Link>
      </Container>
    </section>
  );
}
