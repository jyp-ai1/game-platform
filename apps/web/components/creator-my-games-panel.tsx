"use client";

import Link from "next/link";

import { getMyCreatorGames } from "@/lib/creator/creator-store";
import { useMounted } from "@/lib/use-mounted";

export function CreatorMyGamesPanel() {
  const mounted = useMounted();
  if (!mounted) return null;

  const games = getMyCreatorGames();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Games</h1>
        <Link href="/studio/upload" className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white">
          + New Game
        </Link>
      </div>
      {games.length === 0 ? (
        <p className="text-muted-foreground">No games yet. <Link href="/studio/upload" className="text-primary">Create your first →</Link></p>
      ) : (
        <ul className="space-y-2">
          {games.map((g) => (
            <li key={g.id} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
              <div>
                <p className="font-medium">{g.title}</p>
                <p className="text-xs text-muted-foreground">{g.slug} · {g.status}</p>
              </div>
              <span className="text-sm tabular-nums">{g.plays} plays</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
