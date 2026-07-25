"use client";

import {
  getLastNickname,
  getServerNicknameSnapshot,
  subscribeNickname,
} from "@game-platform/game-sdk";
import { Button, Container } from "@game-platform/ui";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import {
  getRecentlyPlayedSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";
import { useMounted } from "@/lib/use-mounted";

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

export function HomeIdentityHero() {
  const mounted = useMounted();
  const nickname = useSyncExternalStore(
    subscribeNickname,
    getLastNickname,
    getServerNicknameSnapshot
  );
  const recentSlugs = useSyncExternalStore(
    subscribeRecentlyPlayed,
    getRecentlyPlayedSnapshot,
    getServerRecentlyPlayedSnapshot
  );

  const continueHref =
    recentSlugs.length > 0 ? `/games/${recentSlugs[0]}` : "/games";

  const headline = mounted
    ? nickname
      ? `${nickname}님`
      : "Welcome Back"
    : "Welcome Back";

  return (
    <section className="relative overflow-hidden border-b py-5 sm:py-7">
      <div className="hero-pixel-grid pointer-events-none absolute inset-0 -z-20" />
      <div className="hero-neon-glow pointer-events-none absolute inset-0 -z-20" />
      <div className="hero-home-orb pointer-events-none absolute -right-16 -top-16 -z-10 size-48 rounded-full bg-primary/20 blur-3xl sm:size-64" />
      <div className="hero-home-orb pointer-events-none absolute -bottom-20 -left-10 -z-10 size-40 rounded-full bg-amber-500/10 blur-3xl" />

      <Container className="relative">
        <p className="text-xs font-medium text-primary/90">
          {mounted ? getTimeGreeting() : "Welcome Back"}
        </p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">{headline}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Play. Track. Challenge.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
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
