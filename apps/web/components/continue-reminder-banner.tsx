"use client";

import type { Game } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import { Play, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

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

const DISMISS_KEY = "play29:continue-reminder-dismiss";

export function ContinueReminderBanner({ games }: { games: Game[] }) {
  const mounted = useMounted();
  const [dismissed, setDismissed] = useState(true);

  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  const recentSlugs = useSyncExternalStore(
    subscribeRecentlyPlayed,
    getRecentlyPlayedSnapshot,
    getServerRecentlyPlayedSnapshot
  );
  const history = useSyncExternalStore(
    subscribePlayHistory,
    getPlayHistorySnapshot,
    getServerPlayHistorySnapshot
  );

  useEffect(() => {
    const until = window.localStorage.getItem(DISMISS_KEY);
    if (until && Date.now() < Number(until)) {
      setDismissed(true);
    } else {
      setDismissed(false);
    }
  }, []);

  const target = useMemo(() => {
    const slug = recentSlugs[0];
    if (!slug) return null;
    const game = games.find((g) => g.slug === slug);
    if (!game) return null;
    const last = filterPlayHistory(history, "all").find((e) => e.slug === slug);
    const agoMin = last
      ? Math.round((Date.now() - new Date(last.startedAt).getTime()) / 60000)
      : null;
    return { game, agoMin };
  }, [recentSlugs, games, history]);

  if (!mounted || dismissed || !target) return null;

  function dismissForToday() {
    const tomorrow = new Date();
    tomorrow.setHours(23, 59, 59, 999);
    window.localStorage.setItem(DISMISS_KEY, String(tomorrow.getTime()));
    setDismissed(true);
  }

  return (
    <div className="border-b border-primary/20 bg-gradient-to-r from-primary/10 to-transparent">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <p className="text-sm">
          <span className="font-medium">Continue Playing</span>
          <span className="mx-2 text-muted-foreground">·</span>
          {target.game.title}
          {target.agoMin !== null && target.agoMin < 1440 ? (
            <span className="ml-1 text-muted-foreground">
              ({target.agoMin < 60 ? `${target.agoMin}m ago` : `${Math.round(target.agoMin / 60)}h ago`})
            </span>
          ) : null}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" className="gap-1" nativeButton={false} render={
            <Link href={`/games/${target.game.slug}`}>
              <Play className="size-3" /> Play
            </Link>
          } />
          <button
            type="button"
            onClick={dismissForToday}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
            aria-label="Dismiss continue reminder"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
