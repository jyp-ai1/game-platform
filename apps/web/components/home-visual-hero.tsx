"use client";

import type { Game } from "@game-platform/shared";
import { Button, Container } from "@game-platform/ui";
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
  const continueHref =
    recentSlugs.length > 0 ? `/games/${recentSlugs[0]}` : "/games";

  return (
    <section className="relative min-h-[100px] overflow-hidden sm:min-h-[120px]">
      <div className="hero-pixel-grid pointer-events-none absolute inset-0" />
      <div className="hero-neon-glow pointer-events-none absolute inset-0" />
      <div className="hero-scanlines pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-brand-amber/10" />
      <div className="hero-home-orb pointer-events-none absolute -left-8 top-4 size-32 rounded-full bg-primary/20 blur-3xl" />
      <div
        className="hero-home-orb pointer-events-none absolute -right-4 bottom-0 size-40 rounded-full bg-brand-amber/15 blur-3xl"
        style={{ animationDelay: "2s" }}
      />
      <div className="pointer-events-none absolute left-1/3 top-1/2 size-24 rotate-12 rounded-3xl border border-white/5 bg-primary/5 blur-sm" />
      <div className="pointer-events-none absolute right-1/4 top-1/4 size-16 -rotate-6 rounded-2xl border border-white/10 bg-card/20" />

      {floatGames.slice(0, 3).map((game, i) => (
        <div
          key={game.slug}
          className="hero-float-card pointer-events-none absolute hidden overflow-hidden rounded-2xl border border-white/10 bg-card/20 shadow-2xl backdrop-blur-md sm:block"
          style={{
            width: 64 + i * 10,
            height: 40 + i * 6,
            top: `${8 + i * 10}%`,
            right: `${6 + i * 12}%`,
            transform: `rotate(${-6 + i * 4}deg)`,
            animationDelay: `${i * 0.6}s`,
          }}
        >
          {game.thumbnailUrl ? (
            <Image src={game.thumbnailUrl} alt="" fill className="object-cover opacity-70" />
          ) : null}
        </div>
      ))}

      <Container className="relative flex min-h-[100px] items-end justify-between gap-4 py-4 sm:min-h-[120px] sm:py-5">
        <p className="text-xl font-bold tracking-tight sm:text-2xl">
          Play.<span className="text-primary"> Track.</span>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            className="shadow-md shadow-primary/20"
            nativeButton={false}
            render={<Link href={continueHref}>Play</Link>}
          />
          <Button
            size="sm"
            variant="outline"
            className="border-white/20 bg-background/30 backdrop-blur"
            nativeButton={false}
            render={<Link href="/games">Discover</Link>}
          />
        </div>
      </Container>
    </section>
  );
}
