"use client";

import { getBestScore } from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";
import { Button, Container } from "@game-platform/ui";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import {
  getRecentlyPlayedSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";
import { subscribeLiveData } from "@/lib/live-data-bus";
import {
  filterPlayHistory,
  getPlayHistorySnapshot,
  getServerPlayHistorySnapshot,
  subscribePlayHistory,
} from "@/lib/play-history";
import { useMounted } from "@/lib/use-mounted";

function formatSessionTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return isToday ? `오늘 ${time}` : `${d.getMonth() + 1}/${d.getDate()} ${time}`;
}

function formatSurvival(durationSec: number): string {
  if (durationSec < 60) return "생존 1분 미만";
  const min = Math.max(1, Math.round(durationSec / 60));
  return `생존 ${min}분`;
}

function ContinueRow({
  game,
  score,
  startedAt,
  durationSec,
}: {
  game: Game;
  score: number;
  startedAt: string;
  durationSec: number;
}) {
  const href = game.slug === "snake" ? "/flagship/snake-io/play?room=WORLD" : `/games/${game.slug}`;
  return (
    <div
      data-testid="home-continue-row"
      className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-card/40 px-4 py-3"
    >
      <div>
        <p className="font-semibold">{game.title}</p>
        <p className="text-sm font-medium tabular-nums">
          {score > 0 ? `${score.toLocaleString()}점` : "—"}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatSessionTime(startedAt)}
          {" · "}
          {formatSurvival(durationSec)}
        </p>
      </div>
      <Button size="sm" nativeButton={false} render={<Link href={href}>이어하기</Link>} />
    </div>
  );
}

function ContinueEmptyState() {
  return (
    <div
      data-testid="home-continue-empty"
      className="rounded-xl border border-dashed border-white/15 bg-card/30 px-4 py-5 text-center"
    >
      <p className="text-sm text-muted-foreground">플레이 기록이 없습니다.</p>
      <p className="mt-1 font-medium">Snake를 시작해보세요.</p>
      <Button
        className="mt-3 gap-1.5 bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
        size="sm"
        nativeButton={false}
        render={<Link href="/flagship/snake-io/play?room=WORLD">바로 참가</Link>}
      />
    </div>
  );
}

export function HomeContinueHub({ games }: { games: Game[] }) {
  const mounted = useMounted();
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  const slugs = useSyncExternalStore(
    subscribeRecentlyPlayed,
    getRecentlyPlayedSnapshot,
    getServerRecentlyPlayedSnapshot
  );
  const history = useSyncExternalStore(
    subscribePlayHistory,
    getPlayHistorySnapshot,
    getServerPlayHistorySnapshot
  );

  const bySlug = useMemo(() => new Map(games.map((game) => [game.slug, game])), [games]);

  const rows = useMemo(() => {
    if (!mounted) return [];
    return slugs
      .map((slug) => {
        const game = bySlug.get(slug);
        if (!game) return null;
        const entry = filterPlayHistory(history, "all").find((e) => e.slug === slug);
        if (!entry) return null;
        return {
          game,
          score: getBestScore(slug),
          startedAt: entry.startedAt,
          durationSec: entry.durationSec,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .slice(0, 2);
  }, [slugs, bySlug, history, mounted]);

  if (!mounted) return null;

  return (
    <section data-testid="home-continue" className="py-4 sm:py-5">
      <Container>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
          Continue Playing
        </p>
        {rows.length === 0 ? (
          <ContinueEmptyState />
        ) : (
          <div className="space-y-2">
            {rows.map(({ game, score, startedAt, durationSec }) => (
              <ContinueRow
                key={game.id}
                game={game}
                score={score}
                startedAt={startedAt}
                durationSec={durationSec}
              />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
