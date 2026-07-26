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
import { getTopMotivation, getPrimaryPlayHref } from "@/lib/motivation-engine";
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
  const playHref = getPrimaryPlayHref(games);

  return (
    <section className="relative overflow-hidden border-b border-primary/20 bg-gradient-to-br from-primary/15 via-card/90 to-card/70 py-8 sm:py-10">
      <Container className="relative">
        <p className="text-sm font-medium text-primary">{living.periodLabel}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{displayName}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{statement}</p>

        {top ? (
          <div
            className={`mt-6 rounded-2xl border p-5 ${
              top.isLoss
                ? "border-red-500/40 bg-red-500/10"
                : "border-primary/30 bg-primary/10"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {top.isLoss ? "지금 안 하면" : "오늘의 동기"} · {top.score}pt
            </p>
            <p className="mt-2 flex items-center gap-2 text-xl font-bold">
              <span>{top.emoji}</span>
              {top.headline}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{top.detail}</p>
            <Link
              href={top.ctaHref}
              className="mt-4 inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20"
            >
              {top.ctaLabel} →
            </Link>
          </div>
        ) : (
          <Link
            href={playHref}
            className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            Replay 시작 →
          </Link>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium">
            {living.titleKo}
          </span>
          <Link href="/passport" className="rounded-full border px-3 py-1 text-xs hover:border-primary/40">
            Passport
          </Link>
          <Link href="/community" className="rounded-full border px-3 py-1 text-xs hover:border-primary/40">
            Relationship Feed
          </Link>
        </div>
      </Container>
    </section>
  );
}
