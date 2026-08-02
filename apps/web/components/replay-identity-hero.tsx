"use client";

import type { Game } from "@game-platform/shared";
import { Container } from "@game-platform/ui";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { subscribeLiveData } from "@/lib/live-data-bus";
import { buildReplayIdentityProfile } from "@/lib/replay-identity";
import { useMounted } from "@/lib/use-mounted";

/** Emotional Replay Identity — "당신은 Puzzle Master입니다." */
export function ReplayIdentityHero({ games }: { games: Game[] }) {
  const mounted = useMounted();
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const profile = useMemo(() => {
    if (!mounted) return null;
    return buildReplayIdentityProfile(games);
  }, [games, mounted]);

  if (!mounted || !profile) return null;

  const genreLabel =
    profile.topGenre.includes("puzzle") || profile.topGenre.includes("퍼즐")
      ? "퍼즐"
      : profile.topGenre;

  return (
    <section className="border-y border-primary/15 bg-gradient-to-br from-primary/10 via-card/80 to-card/60 py-8">
      <Container>
        <p className="text-sm text-muted-foreground">당신은</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          {profile.titleKo}
        </h2>
        <p className="mt-1 text-lg text-muted-foreground">{profile.title}</p>

        <div className="mt-6 space-y-2 text-base sm:text-lg">
          <p>
            <span className="font-semibold text-foreground">{genreLabel}</span>
            를{" "}
            <span className="font-bold tabular-nums text-primary">
              {profile.topGenrePlays.toLocaleString()}회
            </span>{" "}
            플레이했습니다.
          </p>
          {profile.yearHours > 0 ? (
            <p>
              올해{" "}
              <span className="font-bold tabular-nums text-primary">
                {profile.yearHours}시간
              </span>{" "}
              즐겼습니다.
            </p>
          ) : profile.todayMinutes > 0 ? (
            <p>
              오늘{" "}
              <span className="font-bold tabular-nums text-primary">
                {profile.todayMinutes}분
              </span>{" "}
              플레이했습니다.
            </p>
          ) : (
            <p className="text-muted-foreground">첫 게임을 시작하면 기록이 쌓입니다.</p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-white/10 bg-card/60 px-3 py-1">
            Lv.{profile.level}
          </span>
          <span className="rounded-full border border-white/10 bg-card/60 px-3 py-1">
            Replay {profile.replayScore}
          </span>
          <span className="rounded-full border border-white/10 bg-card/60 px-3 py-1">
            {profile.replayTier}
          </span>
          {profile.streakDays > 0 ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary">
              {profile.streakDays}일 streak
            </span>
          ) : null}
          <span className="rounded-full border border-white/10 bg-card/60 px-3 py-1">
            {profile.playStyle}
          </span>
        </div>

        <Link
          href="/profile"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Profile →
        </Link>
      </Container>
    </section>
  );
}
