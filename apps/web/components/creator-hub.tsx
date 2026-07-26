"use client";

import type { Game } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import { Flame, Plus, Sparkles, TrendingUp, Users } from "lucide-react";
import Link from "next/link";

import { CreatorIdentityCard } from "@/components/creator-identity-card";
import { CREATOR_TYPES } from "@/lib/creator/creator-types";
import { FEATURED_CREATORS, getMyCreatorGames } from "@/lib/creator/creator-store";
import { GAME_TEMPLATES } from "@/lib/creator/template-marketplace";

export function CreatorHub({ games }: { games: Game[] }) {
  const hotGames = games.filter((g) => g.isFeatured).slice(0, 6);
  const newGames = [...games].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const myGames = typeof window !== "undefined" ? getMyCreatorGames() : [];

  return (
    <div className="flex flex-col gap-8">
      <CreatorIdentityCard compact />

      <div className="flex flex-wrap gap-3">
        <Button nativeButton={false} render={<Link href="/studio/create"><Plus className="size-4" /> Create Game</Link>} />
        <Button variant="outline" nativeButton={false} render={<Link href="/studio">Creator Studio</Link>} />
        <Button variant="outline" nativeButton={false} render={<Link href="/studio/templates">Templates</Link>} />
        <Button variant="outline" nativeButton={false} render={<Link href="/marketplace">Marketplace</Link>} />
      </div>

      <section>
        <h2 className="font-semibold">Creator Types</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {CREATOR_TYPES.map((t) => (
            <Link key={t.id} href={t.studioHref} className="rounded-2xl border border-white/10 bg-card/50 p-4 transition hover:border-violet-500/30">
              <p className="text-2xl">{t.emoji}</p>
              <p className="mt-2 font-medium">{t.labelKo}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {myGames.length > 0 ? (
        <section>
          <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-primary" /> My Games</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myGames.slice(0, 3).map((g) => (
              <GameCard key={g.id} title={g.title} slug={g.slug} meta={`${g.plays} plays · ${g.status}`} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="flex items-center gap-2 font-semibold"><Users className="size-4 text-violet-400" /> Featured Creators</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {FEATURED_CREATORS.map((c) => (
            <Link key={c.id} href={`/creators/${c.id}`} className="rounded-2xl border border-white/10 bg-card/50 p-4 transition hover:border-primary/30">
              <p className="font-semibold">{c.displayName}</p>
              <p className="text-xs text-muted-foreground">Lv{c.level} Creator · {c.publishedCount} games</p>
              <p className="mt-2 text-sm tabular-nums">{c.totalPlays.toLocaleString()} plays · {c.followers} followers</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="flex items-center gap-2 font-semibold"><Flame className="size-4 text-amber-400" /> This Week HOT</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hotGames.map((g) => (
            <GameCard key={g.id} title={g.title} slug={g.slug} meta={`${g.playCount.toLocaleString()} plays`} href={`/games/${g.slug}`} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="flex items-center gap-2 font-semibold"><TrendingUp className="size-4 text-emerald-400" /> New Games</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {newGames.map((g) => (
            <GameCard key={g.id} title={g.title} slug={g.slug} meta="New" href={`/games/${g.slug}`} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold">Start from Template</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {GAME_TEMPLATES.filter((t) => t.featured || t.id === "blank").map((t) => (
            <Link key={t.id} href={`/studio/upload?template=${t.id}`} className="rounded-xl border border-white/10 bg-card/40 p-3 text-center text-sm hover:border-primary/30">
              {t.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function GameCard({ title, slug, meta, href }: { title: string; slug: string; meta: string; href?: string }) {
  const link = href ?? `/studio/games`;
  return (
    <Link href={link} className="rounded-2xl border border-white/10 bg-card/50 p-4 transition hover:border-primary/25">
      <p className="font-medium">{title}</p>
      <p className="text-xs capitalize text-muted-foreground">{slug.replace(/-/g, " ")}</p>
      <p className="mt-2 text-xs text-primary">{meta}</p>
    </Link>
  );
}
