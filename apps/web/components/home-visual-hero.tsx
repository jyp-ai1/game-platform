"use client";

import type { Game } from "@game-platform/shared";
import { Button, Container } from "@game-platform/ui";
import Image from "next/image";
import Link from "next/link";

import {
  getRecentlyPlayedSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";
import { useSyncExternalStore } from "react";

export function HomeVisualHero({ floatGames }: { floatGames: Game[] }) {
  const recentSlugs = useSyncExternalStore(
    subscribeRecentlyPlayed,
    getRecentlyPlayedSnapshot,
    getServerRecentlyPlayedSnapshot
  );
  const continueHref =
    recentSlugs.length > 0 ? `/games/${recentSlugs[0]}` : "/games";

  return (
    <section className="relative min-h-[200px] overflow-hidden border-b sm:min-h-[240px]">
      <div className="hero-pixel-grid pointer-events-none absolute inset-0" />
      <div className="hero-neon-glow pointer-events-none absolute inset-0" />
      <div className="hero-scanlines pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />

      {floatGames.slice(0, 4).map((game, i) => (
        <div
          key={game.slug}
          className="hero-float-card pointer-events-none absolute hidden overflow-hidden rounded-2xl border border-white/10 bg-card/30 shadow-2xl backdrop-blur-md sm:block"
          style={{
            width: 88 + i * 12,
            height: 56 + i * 8,
            top: `${12 + i * 8}%`,
            right: `${8 + i * 14}%`,
            transform: `rotate(${-8 + i * 5}deg)`,
            animationDelay: `${i * 0.8}s`,
          }}
        >
          {game.thumbnailUrl ? (
            <Image
              src={game.thumbnailUrl}
              alt=""
              fill
              className="rounded-2xl object-cover opacity-80"
            />
          ) : null}
        </div>
      ))}

      <Container className="relative flex min-h-[200px] flex-col justify-end py-8 sm:min-h-[240px] sm:py-10">
        <p className="text-3xl font-bold tracking-tight sm:text-4xl">
          Play.<span className="text-primary"> Track.</span> Challenge.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            size="lg"
            className="shadow-lg shadow-primary/20"
            nativeButton={false}
            render={<Link href={continueHref}>Play</Link>}
          />
          <Button
            size="lg"
            variant="outline"
            className="border-white/20 bg-background/40 backdrop-blur"
            nativeButton={false}
            render={<Link href="/games">Discover</Link>}
          />
        </div>
      </Container>
    </section>
  );
}
