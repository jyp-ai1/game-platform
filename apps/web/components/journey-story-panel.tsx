"use client";

import type { Game } from "@game-platform/shared";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { buildReplayStoryFeed, type StoryEvent } from "@/lib/replay-story-feed";
import { subscribeLiveData } from "@/lib/live-data-bus";
import { getTodayMissionProgress } from "@/lib/universal-mission-engine";
import { useMounted } from "@/lib/use-mounted";

function formatWhen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "방금";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  return `${Math.floor(diff / 86_400_000)}일 전`;
}

/** Journey as chronological story feed. */
export function JourneyStoryPanel({ games }: { games: Game[] }) {
  const mounted = useMounted();
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const events = useMemo(() => {
    if (!mounted) return [];
    return buildReplayStoryFeed(games, 12);
  }, [games, mounted]);

  const mission = mounted ? getTodayMissionProgress() : { done: 0, total: 0, pct: 0 };

  if (!mounted) return null;

  return (
    <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card/60 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Your Story</p>
      <h2 className="mt-2 text-xl font-bold">오늘의 Replay</h2>

      {mission.total > 0 && mission.done < mission.total ? (
        <Link
          href="/missions"
          className="mt-4 block rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm hover:border-amber-500/50"
        >
          미션 {mission.done}/{mission.total} —{" "}
          <span className="font-semibold text-amber-400">계속하기 →</span>
        </Link>
      ) : null}

      <ol className="mt-6 space-y-0">
        {events.length === 0 ? (
          <li className="text-sm text-muted-foreground">첫 게임을 플레이하면 스토리가 쌓입니다.</li>
        ) : (
          events.map((e, i) => (
            <StoryBeat key={e.id} event={e} isLast={i === events.length - 1} when={formatWhen(e.createdAt)} />
          ))
        )}
      </ol>
    </section>
  );
}

function StoryBeat({
  event,
  isLast,
  when,
}: {
  event: StoryEvent;
  isLast: boolean;
  when: string;
}) {
  return (
    <li className="relative pl-8 pb-6">
      {!isLast ? (
        <span className="absolute left-[11px] top-6 h-[calc(100%-8px)] w-0.5 bg-primary/20" aria-hidden />
      ) : null}
      <span className="absolute left-0 top-1 flex size-6 items-center justify-center rounded-full border-2 border-primary bg-background text-xs">
        {event.emoji}
      </span>
      <Link href={event.href} className="block rounded-xl transition-colors hover:bg-muted/20">
        <p className="text-xs text-muted-foreground">
          {event.actor} · {when}
        </p>
        <p className="mt-0.5 font-semibold">{event.headline}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{event.detail}</p>
      </Link>
    </li>
  );
}
