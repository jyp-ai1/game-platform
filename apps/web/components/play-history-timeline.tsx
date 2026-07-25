"use client";

import type { Game } from "@game-platform/shared";
import { cn } from "@game-platform/ui";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import {
  filterPlayHistory,
  formatDuration,
  getPlayHistorySnapshot,
  getServerPlayHistorySnapshot,
  groupHistoryByDay,
  subscribePlayHistory,
  type PlayHistoryPeriod,
} from "@/lib/play-history";
import { formatRelativeTime } from "@/lib/format-relative-time";

const PERIODS: { id: PlayHistoryPeriod; label: string }[] = [
  { id: "today", label: "오늘" },
  { id: "week", label: "이번주" },
  { id: "month", label: "이번달" },
  { id: "all", label: "전체" },
];

export function PlayHistoryTimeline({ games }: { games: Game[] }) {
  const [period, setPeriod] = useState<PlayHistoryPeriod>("week");
  const history = useSyncExternalStore(
    subscribePlayHistory,
    getPlayHistorySnapshot,
    getServerPlayHistorySnapshot
  );

  const bySlug = useMemo(() => new Map(games.map((g) => [g.slug, g])), [games]);

  const filtered = useMemo(
    () => filterPlayHistory(history, period),
    [history, period]
  );
  const grouped = useMemo(() => groupHistoryByDay(filtered), [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              period === p.id
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:border-primary/40"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          이 기간에 플레이 기록이 없습니다.{" "}
          <Link href="/games" className="font-medium text-primary underline">
            게임 시작
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.date}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <ol className="mt-2 space-y-2">
                {group.entries.map((entry) => {
                  const game = bySlug.get(entry.slug);
                  return (
                    <li key={entry.id}>
                      <Link
                        href={`/games/${entry.slug}`}
                        className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary/40"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{game?.title ?? entry.slug}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeTime(entry.startedAt)} · ~
                            {formatDuration(entry.durationSec)}
                          </p>
                        </div>
                        <span className="text-xs text-primary">플레이 →</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
