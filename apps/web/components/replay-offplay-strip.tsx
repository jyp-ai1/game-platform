"use client";

import type { Game } from "@game-platform/shared";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { subscribeLiveData } from "@/lib/live-data-bus";
import { getOffPlayNudges } from "@/lib/replay-loop";
import { useMounted } from "@/lib/use-mounted";

/** Off-play engagement — when user is NOT in a game. */
export function ReplayOffPlayStrip({ games }: { games: Game[] }) {
  const mounted = useMounted();
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const nudges = useMemo(() => {
    if (!mounted) return [];
    return getOffPlayNudges(games);
  }, [games, mounted]);

  if (!mounted || nudges.length === 0) return null;

  return (
    <section className="border-b border-amber-500/20 bg-amber-500/5 py-3">
      <div className="mx-auto max-w-6xl space-y-2 px-4">
        {nudges.map((n) => (
          <Link
            key={n.id}
            href={n.href}
            className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-card/60 px-4 py-2.5 text-sm transition-colors hover:border-amber-500/40"
          >
            <span>{n.message}</span>
            <span className="shrink-0 font-medium text-amber-400">{n.action} →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
