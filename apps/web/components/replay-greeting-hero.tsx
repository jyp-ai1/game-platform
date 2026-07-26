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
import { buildHabitState } from "@/lib/habit-engine";
import { getTimeGreetingKo } from "@/lib/emotion-engine";
import { buildNetworkState } from "@/lib/network-engine";
import { buildFullReplayIdentity, getIdentityStatement } from "@/lib/replay-identity";
import { getPrimaryPlayHref } from "@/lib/motivation-engine";
import { useMounted } from "@/lib/use-mounted";

/** Emotion-first home — 나 → 성장 → 친구 → 게임 (Replay OS v4). */
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
    const name = nickname || "Player";
    const identity = buildFullReplayIdentity(games, name);
    const habit = buildHabitState(games);
    const network = buildNetworkState();
    return { identity, habit, network, name };
  }, [games, mounted, nickname]);

  if (!mounted || !state) return null;

  const { identity, habit, network, name } = state;
  const displayName = name === "Player" ? "Player" : `${name}님`;
  const playHref = getPrimaryPlayHref(games);
  const identityLine = getIdentityStatement(identity);

  return (
    <section className="relative overflow-hidden border-b border-primary/20 bg-gradient-to-br from-primary/15 via-card/90 to-card/70 py-8 sm:py-10">
      <Container className="relative">
        <p className="text-sm font-medium text-primary">{getTimeGreetingKo()}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{displayName}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{identityLine}</p>

        <div className="mt-5 space-y-2 text-base">
          {!habit.todayPlayed ? (
            <p>
              오늘 Replay Score{" "}
              <span className="font-bold tabular-nums text-primary">+{habit.possibleScoreGain}</span>
              {" "}가능합니다.
            </p>
          ) : (
            <p className="text-emerald-400">오늘 Replay 중 — 잘하고 있어요!</p>
          )}
          {network.waitingFriends > 0 ? (
            <p>
              친구{" "}
              <span className="font-bold text-amber-400">{network.waitingFriends}명</span>
              이 기다리고 있습니다.
            </p>
          ) : null}
        </div>

        {habit.lossMessage ? (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
            ⚠ {habit.lossMessage}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {identity.badgeLabelsKo.map((b) => (
            <span
              key={b}
              className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {b}
            </span>
          ))}
          <span className="rounded-full border border-white/10 bg-card/60 px-3 py-1 text-xs">
            Lv.{identity.level}
          </span>
          <span className="rounded-full border border-white/10 bg-card/60 px-3 py-1 text-xs">
            Replay {identity.replayScore}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={playHref}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Replay 시작 →
          </Link>
          <Link href="/passport" className="rounded-xl border px-5 py-2.5 text-sm">
            Passport
          </Link>
          <Link href="/community" className="rounded-xl border px-5 py-2.5 text-sm">
            Replay Feed
          </Link>
        </div>
      </Container>
    </section>
  );
}
