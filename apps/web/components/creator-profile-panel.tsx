"use client";

import type { CreatorProfile } from "@/lib/creator/creator-store";
import { getCreatorPublishedGames } from "@/lib/creator/creator-store";
import { getCreatorTitle } from "@/lib/creator/creator-identity";
import Link from "next/link";

export function CreatorProfilePanel({ creator }: { creator: CreatorProfile }) {
  const games = getCreatorPublishedGames(creator.id);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-card to-card/80 p-8">
        <p className="text-xs uppercase tracking-widest text-violet-400">Developer Profile</p>
        <h1 className="mt-2 text-3xl font-bold">{creator.displayName}</h1>
        <p className="mt-1 text-lg text-violet-400">Lv{creator.level} {getCreatorTitle(creator.level)}</p>
        <p className="mt-2 text-sm text-muted-foreground">{creator.bio}</p>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Games" value={String(creator.publishedCount)} />
          <Stat label="Total Plays" value={creator.totalPlays.toLocaleString()} />
          <Stat label="Likes" value={creator.totalLikes.toLocaleString()} />
          <Stat label="Followers" value={String(creator.followers)} />
        </div>

        <button type="button" className="mt-6 rounded-xl border border-violet-500/40 px-5 py-2 text-sm font-medium text-violet-300 hover:bg-violet-500/10">
          Follow
        </button>
      </div>

      <section>
        <h2 className="font-semibold">Published Games</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {games.map((g) => (
            <Link key={g.id} href={`/games/${g.slug}`} className="rounded-2xl border border-white/10 bg-card/50 p-4 hover:border-primary/25">
              <p className="font-medium">{g.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{g.plays.toLocaleString()} plays · {g.likes} likes</p>
            </Link>
          ))}
          {games.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published games yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-card/50 p-3">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
