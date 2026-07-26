"use client";

import type { Game } from "@game-platform/shared";
import { Container } from "@game-platform/ui";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { buildActionTimeline } from "@/lib/timeline-actions";
import { subscribeLiveData } from "@/lib/live-data-bus";
import { useMounted } from "@/lib/use-mounted";

/** Timeline with action CTAs on every beat. */
export function ReplayTimelineStrip({ games }: { games: Game[] }) {
  const mounted = useMounted();
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const beats = useMemo(() => {
    if (!mounted) return [];
    return buildActionTimeline(games, 5);
  }, [games, mounted]);

  if (!mounted || beats.length === 0) return null;

  return (
    <section className="border-b border-white/5 py-6">
      <Container>
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Replay Timeline</h2>
          <Link href="/journey" className="text-xs text-primary hover:underline">
            전체 →
          </Link>
        </div>
        <ol className="mt-4 space-y-3">
          {beats.map((b) => (
            <li key={b.id} className="rounded-xl border border-white/5 bg-card/40 px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="text-lg">{b.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{b.text}</p>
                  <p className="text-xs text-muted-foreground">{b.sub}</p>
                </div>
              </div>
              <Link
                href={b.href}
                className="mt-3 inline-flex rounded-lg bg-primary/15 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/25"
              >
                {b.ctaLabel} →
              </Link>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
