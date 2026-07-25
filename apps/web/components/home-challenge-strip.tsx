"use client";

import type { Game } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import { Swords } from "lucide-react";
import Link from "next/link";

import { getRecentlyPlayedSnapshot } from "@/lib/local-storage";
import { useMounted } from "@/lib/use-mounted";

/** Home challenge strip — send a challenge after your last game. */
export function HomeChallengeStrip({ games }: { games: Game[] }) {
  const mounted = useMounted();
  if (!mounted) return null;

  const slug = getRecentlyPlayedSnapshot()[0] ?? games[0]?.slug ?? "snake";
  const game = games.find((g) => g.slug === slug);

  return (
    <section className="py-4">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col gap-4 rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-card/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Swords className="mt-0.5 size-5 text-amber-400" />
            <div>
              <p className="font-semibold">Challenge a Friend</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {game ? `${game.title}에서 친구에게 도전장 보내기` : "친구와 점수 겨루기"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 gap-1"
            nativeButton={false}
            render={
              <Link href={`/community#challenge`}>
                도전장 보내기 →
              </Link>
            }
          />
        </div>
      </div>
    </section>
  );
}
