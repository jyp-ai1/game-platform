"use client";

import type { Game } from "@game-platform/shared";
import { Container } from "@game-platform/ui";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import {
  getLastNickname,
  getServerNicknameSnapshot,
  subscribeNickname,
} from "@game-platform/game-sdk";

import { subscribeLiveData } from "@/lib/live-data-bus";
import { getLivingIdentity, getLivingIdentityStatement } from "@/lib/living-identity";
import { getTopMotivation } from "@/lib/motivation-engine";
import { useMounted } from "@/lib/use-mounted";

/** Home hero — single strongest motivation only (Priority Engine). */
export function ReplayGreetingHero({ games }: { games: Game[] }) {
  const mounted = useMounted();
  const nickname = useSyncExternalStore(
    subscribeNickname,
    getLastNickname,
    getServerNicknameSnapshot
  );
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const state = useMemo(() => {
    if (!mounted) return null;
    const top = getTopMotivation(games);
    const living = getLivingIdentity(games);
    const statement = getLivingIdentityStatement(games);
    return { top, living, statement, name: nickname || "Player" };
  }, [games, mounted, nickname]);

  if (!mounted || !state) return null;

  const { top, living, statement, name } = state;
  const displayName = name === "Player" ? "Player" : `${name}님`;

  return (
    <section className="relative overflow-hidden border-b border-white/5 bg-card/40 py-5 sm:py-6">
      <Container className="relative">
        <p className="text-sm font-medium text-primary">{living.periodLabel}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{displayName}</h1>
        <p className="mt-1 text-base text-muted-foreground">{statement}</p>

        {top ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {top.emoji} {top.headline}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium">
            {living.titleKo}
          </span>
          <Link href="/profile" className="rounded-full border px-3 py-1 text-xs hover:border-primary/40">
            Profile
          </Link>
          <Link href="/community" className="rounded-full border px-3 py-1 text-xs hover:border-primary/40">
            Community
          </Link>
        </div>
      </Container>
    </section>
  );
}
