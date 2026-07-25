"use client";

import type { Game } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import { Share2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { buildWrappedSnapshot } from "@/lib/wrapped-data";
import { replayScoreTier } from "@/lib/replay-score";

export function WrappedExperience({ games }: { games: Game[] }) {
  const data = useMemo(() => buildWrappedSnapshot(games), [games]);
  const year = new Date().getFullYear();

  async function handleShare() {
    const text = `My ${year} Re:Play Wrapped — ${data.totalPlays} plays, ${data.favoriteGenre} fan, Replay Score ${data.replayScore}!`;
    if (navigator.share) {
      await navigator.share({ title: "Replay Wrapped", text, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(text);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/25 via-purple-500/10 to-card p-8 text-center animate-in fade-in">
        <Sparkles className="mx-auto size-10 text-primary" />
        <p className="mt-4 text-xs uppercase tracking-[0.3em] text-primary">{year} Wrapped</p>
        <h1 className="mt-2 text-4xl font-black sm:text-5xl">Your Replay Year</h1>
        <p className="mt-2 text-muted-foreground">{replayScoreTier(data.replayScore)} Player</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: "Total Plays", value: data.totalPlays, sub: "sessions" },
          { label: "Play Time", value: `${data.monthlyMinutes}+`, sub: "minutes this month" },
          { label: "Top Genre", value: data.favoriteGenre, sub: "your vibe" },
          { label: "Play Style", value: data.playStyle, sub: "identity" },
          { label: "Streak", value: `${data.streakDays} days`, sub: "keep going" },
          { label: "Replay Score", value: data.replayScore, sub: "out of 1000" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/10 bg-card/60 p-6 backdrop-blur transition-transform hover:scale-[1.02]"
          >
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-3xl font-bold">{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.sub}</p>
          </div>
        ))}
      </div>

      {data.topGames.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-card/50 p-6">
          <h2 className="text-lg font-semibold">Top Games</h2>
          <ol className="mt-4 space-y-2">
            {data.topGames.map((g, i) => (
              <li key={g.slug} className="flex items-center justify-between text-sm">
                <Link href={`/games/${g.slug}`} className="font-medium hover:text-primary">
                  #{i + 1} {g.slug}
                </Link>
                <span className="text-muted-foreground">{g.plays} plays</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleShare} className="gap-2">
          <Share2 className="size-4" /> Share Wrapped
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/profile">Back to Profile</Link>} />
        <Button variant="secondary" nativeButton={false} render={<Link href="/games">Play More</Link>} />
      </div>
    </div>
  );
}
