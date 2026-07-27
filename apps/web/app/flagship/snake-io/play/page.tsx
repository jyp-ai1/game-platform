import { SnakeIoPlayClientRoot } from "@/components/snake-io-play-client";
import { SnakeIoPlayMeta } from "@/components/snake-io-play-meta";
import { selectRelated } from "@/lib/game-sections";
import { getGameBySlug, getGames } from "@/lib/supabase/games";
import { Suspense } from "react";

export const metadata = { title: "Replay Snake.io — Play" };

export default async function SnakeIoPlayPage() {
  const [game, allGames] = await Promise.all([
    getGameBySlug("snake"),
    getGames(),
  ]);
  const related = game ? selectRelated(allGames, game) : [];

  return (
    <main className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background">
      <div className="shrink-0 overflow-hidden">
        <Suspense fallback={<p className="py-8 text-center text-muted-foreground">Loading…</p>}>
          <SnakeIoPlayClientRoot />
        </Suspense>
      </div>
      {game ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SnakeIoPlayMeta game={game} related={related} allGames={allGames} />
        </div>
      ) : null}
    </main>
  );
}
