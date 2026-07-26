"use client";

import type { Game } from "@game-platform/shared";
import Link from "next/link";

import { FEATURED_CREATORS } from "@/lib/creator/creator-store";

export function CreatorCommunityPanel({ games }: { games: Game[] }) {
  const todayGames = games.slice(0, 4);
  const hotGames = games.filter((g) => g.isFeatured).slice(0, 4);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-semibold">오늘 올라온 게임</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {todayGames.map((g) => (
            <Link key={g.id} href={`/games/${g.slug}`} className="rounded-xl border border-white/10 p-3 text-sm hover:border-primary/25">
              {g.title}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold">이번주 HOT</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {hotGames.map((g) => (
            <Link key={g.id} href={`/games/${g.slug}`} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
              🔥 {g.title}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold">Creator Ranking</h2>
        <ol className="mt-3 space-y-2">
          {FEATURED_CREATORS.map((c, i) => (
            <li key={c.id}>
              <Link href={`/creators/${c.id}`} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm hover:border-violet-500/25">
                <span>#{i + 1} {c.displayName}</span>
                <span className="text-muted-foreground">{c.totalPlays.toLocaleString()} plays</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
