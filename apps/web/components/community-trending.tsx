"use client";

import type { Game } from "@game-platform/shared";
import { Badge, Button } from "@game-platform/ui";
import { Flame, TrendingUp, Trophy, Zap } from "lucide-react";
import Link from "next/link";

import { listComments } from "@/lib/community-store";
import { selectHotSlugs, selectPopular } from "@/lib/game-sections";

export function CommunityTrending({ games }: { games: Game[] }) {
  const hot = selectHotSlugs(games);
  const popular = selectPopular(games, 6);
  const comments = listComments("popular").slice(0, 3);

  const sections = [
    {
      title: "Today's Hot",
      icon: Flame,
      items: popular.slice(0, 4),
      tone: "text-orange-400",
    },
    {
      title: "Trending",
      icon: TrendingUp,
      items: games.filter((g) => hot.has(g.slug)).slice(0, 4),
      tone: "text-emerald-400",
    },
    {
      title: "Most Played",
      icon: Trophy,
      items: popular.slice(0, 4),
      tone: "text-amber-400",
    },
    {
      title: "Fastest Growing",
      icon: Zap,
      items: popular.slice(2, 6),
      tone: "text-primary",
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {sections.map((section) => (
        <section
          key={section.title}
          className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur transition-shadow hover:shadow-lg"
        >
          <div className="flex items-center gap-2">
            <section.icon className={`size-4 ${section.tone}`} />
            <h3 className="font-semibold">{section.title}</h3>
          </div>
          <ul className="mt-3 space-y-2">
            {section.items.map((game, i) => (
              <li key={game.id}>
                <Link
                  href={`/games/${game.slug}`}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-primary/5"
                >
                  <span>
                    <span className="mr-2 text-muted-foreground">#{i + 1}</span>
                    {game.title}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {game.difficulty}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur lg:col-span-2">
        <h3 className="font-semibold">Best Records This Week</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {popular.slice(0, 3).map((game) => (
            <Link
              key={game.id}
              href={`/games/${game.slug}`}
              className="rounded-xl border border-white/5 bg-background/40 p-3 text-sm hover:border-primary/30"
            >
              <p className="font-medium">{game.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">View leaderboard →</p>
            </Link>
          ))}
        </div>
      </section>

      {comments.length > 0 ? (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 lg:col-span-2">
          <h3 className="font-semibold">Recent Buzz</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {comments.map((c) => (
              <li key={c.id}>
                <span className="text-primary">{c.gameSlug}</span> — {c.message.slice(0, 80)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
