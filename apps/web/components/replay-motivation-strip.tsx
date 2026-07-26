"use client";

import type { Game } from "@game-platform/shared";
import { Container } from "@game-platform/ui";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { subscribeLiveData } from "@/lib/live-data-bus";
import { buildPlayMotivations, getPrimaryPlayHref } from "@/lib/motivation-engine";
import { useMounted } from "@/lib/use-mounted";

/** Motivation Engine UI — every hook → Replay 시작. */
export function ReplayMotivationStrip({ games }: { games: Game[] }) {
  const mounted = useMounted();
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const motivations = useMemo(() => {
    if (!mounted) return [];
    return buildPlayMotivations(games);
  }, [games, mounted]);

  const startHref = useMemo(() => {
    if (!mounted) return "/games";
    return getPrimaryPlayHref(games);
  }, [games, mounted]);

  if (!mounted || motivations.length === 0) return null;

  return (
    <section className="border-b border-primary/15 bg-card/40 py-6">
      <Container>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">오늘 한 판?</h2>
        <ul className="mt-4 space-y-2">
          {motivations.map((m) => (
            <li key={m.id}>
              <Link
                href={m.ctaHref}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-background/50 px-4 py-3 transition-colors hover:border-primary/40"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="text-lg">{m.emoji}</span>
                  <div className="min-w-0">
                    <p className="font-medium">{m.headline}</p>
                    <p className="text-xs text-muted-foreground">{m.detail}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary">
                  {m.ctaLabel}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href={startHref}
          className="mt-5 flex w-full items-center justify-center rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-[1.01]"
        >
          Replay 시작 →
        </Link>
      </Container>
    </section>
  );
}
