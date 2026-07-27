"use client";

import type { Game } from "@game-platform/shared";
import { Container } from "@game-platform/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useSyncExternalStore } from "react";

import { subscribeLiveData } from "@/lib/live-data-bus";
import { getSecondaryMotivations } from "@/lib/motivation-engine";
import { isSnakeQuickPlayHref, navigateSnakePlay } from "@/lib/snake-entry";
import { useMounted } from "@/lib/use-mounted";

/** Secondary motivations — top 1 is in greeting hero. */
export function ReplayMotivationStrip({ games }: { games: Game[] }) {
  const router = useRouter();
  const mounted = useMounted();
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const motivations = useMemo(() => {
    if (!mounted) return [];
    return getSecondaryMotivations(games, 3);
  }, [games, mounted]);

  const onPlayClick = useCallback(
    (href: string) => (e: React.MouseEvent) => {
      if (!isSnakeQuickPlayHref(href)) return;
      e.preventDefault();
      void navigateSnakePlay(href, router);
    },
    [router]
  );

  if (!mounted || motivations.length === 0) return null;

  return (
    <section className="border-b border-white/5 bg-card/30 py-4">
      <Container>
        <p className="text-xs text-muted-foreground">다음 동기</p>
        <ul className="mt-2 space-y-2">
          {motivations.map((m) => (
            <li key={m.id}>
              <Link
                href={m.ctaHref}
                onClick={onPlayClick(m.ctaHref)}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-background/40 px-4 py-2.5 text-sm hover:border-primary/30"
              >
                <span className="flex items-center gap-2">
                  <span>{m.emoji}</span>
                  <span className="font-medium">{m.headline}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-primary">{m.ctaLabel}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
