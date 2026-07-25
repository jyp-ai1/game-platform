"use client";

import type { Game } from "@game-platform/shared";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { subscribeLiveData } from "@/lib/live-data-bus";
import { formatPlayTime } from "@/lib/library-analytics";
import {
  filterPlayHistory,
  getPlayHistorySnapshot,
  getServerPlayHistorySnapshot,
  subscribePlayHistory,
} from "@/lib/play-history";
import { buildReplayIdentityProfile } from "@/lib/replay-identity";

/** Journey as story, not spreadsheet. */
export function JourneyStoryPanel({ games }: { games: Game[] }) {
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  const history = useSyncExternalStore(
    subscribePlayHistory,
    getPlayHistorySnapshot,
    getServerPlayHistorySnapshot
  );

  const story = useMemo(() => {
    const identity = buildReplayIdentityProfile(games);
    const todayMin = Math.round(
      filterPlayHistory(history, "today").reduce((s, e) => s + e.durationSec, 0) / 60
    );
    const weekMin = Math.round(
      filterPlayHistory(history, "week").reduce((s, e) => s + e.durationSec, 0) / 60
    );
    return { identity, todayMin, weekMin };
  }, [games, history]);

  const beats = [
    {
      label: "오늘",
      value: story.todayMin > 0 ? `${story.todayMin}분` : "—",
      sub: "플레이",
    },
    {
      label: "이번 주",
      value: formatPlayTime(story.weekMin),
      sub: "함께한 시간",
    },
    {
      label: "가장 많이 한 게임",
      value: story.identity.topGameTitle ?? "—",
      sub: story.identity.topGameSlug ? (
        <Link href={`/games/${story.identity.topGameSlug}`} className="text-primary hover:underline">
          다시 플레이 →
        </Link>
      ) : (
        "아직 기록 없음"
      ),
    },
    {
      label: "이번 달 정체성",
      value: story.identity.titleKo,
      sub: story.identity.playStyle,
    },
  ];

  return (
    <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card/60 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Your Story</p>
      <h2 className="mt-2 text-xl font-bold">Replay Journey</h2>
      <ol className="mt-6 space-y-6">
        {beats.map((b, i) => (
          <li key={b.label} className="relative pl-6">
            {i < beats.length - 1 ? (
              <span
                className="absolute left-[7px] top-8 h-[calc(100%+8px)] w-0.5 bg-primary/20"
                aria-hidden
              />
            ) : null}
            <span className="absolute left-0 top-1 size-4 rounded-full border-2 border-primary bg-background" />
            <p className="text-xs text-muted-foreground">{b.label}</p>
            <p className="text-2xl font-bold">{b.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b.sub}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
