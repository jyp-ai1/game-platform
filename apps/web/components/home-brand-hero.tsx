"use client";

import { Button, Container } from "@game-platform/ui";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import {
  getRecentlyPlayedSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";

/** Sprint 15.3 — brand-first home hero (no game-specific hero). */
export function HomeBrandHero() {
  const recentSlugs = useSyncExternalStore(
    subscribeRecentlyPlayed,
    getRecentlyPlayedSnapshot,
    getServerRecentlyPlayedSnapshot
  );

  const continueHref =
    recentSlugs.length > 0 ? `/games/${recentSlugs[0]}` : "/games";

  return (
    <section
      aria-labelledby="home-brand-heading"
      className="relative overflow-hidden border-b border-primary/20 bg-gradient-to-b from-primary/10 to-transparent py-8 sm:py-12"
    >
      <div className="hero-pixel-grid pointer-events-none absolute inset-0 -z-20" />
      <div className="hero-neon-glow pointer-events-none absolute inset-0 -z-20" />
      <div className="hero-home-orb pointer-events-none absolute -right-16 -top-16 -z-10 size-48 rounded-full bg-primary/20 blur-3xl sm:size-64" />

      <Container className="relative">
        <h1
          id="home-brand-heading"
          className="text-2xl font-bold tracking-tight sm:text-4xl"
        >
          오늘은 무엇을 플레이할까요?
        </h1>

        <div className="mt-4 space-y-0.5 text-lg font-semibold tracking-tight sm:text-2xl">
          <p>Play.</p>
          <p>Pause.</p>
          <p>Replay.</p>
        </div>

        <p className="mt-4 text-sm text-muted-foreground sm:text-base">
          언제든 어디서든 Re:Play
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href={continueHref}>Continue Playing</Link>} />
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/games">Discover Games</Link>}
          />
        </div>
      </Container>
    </section>
  );
}
