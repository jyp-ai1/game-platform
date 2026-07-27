import { SnakeIoPlayClientRoot } from "@/components/snake-io-play-client";
import { SnakeIoPlayMeta } from "@/components/snake-io-play-meta";
import { getGameBySlug } from "@/lib/supabase/games";
import { Suspense } from "react";

export const metadata = { title: "Replay Snake.io — Play" };

export default async function SnakeIoPlayPage() {
  const game = await getGameBySlug("snake");

  return (
    <main className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background">
      <div className="flex shrink-0 justify-center overflow-hidden px-2 pt-2">
        <div className="w-full max-w-3xl">
          <Suspense fallback={<p className="py-8 text-center text-muted-foreground">Loading…</p>}>
            <SnakeIoPlayClientRoot />
          </Suspense>
        </div>
      </div>
      {game ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SnakeIoPlayMeta game={game} />
        </div>
      ) : null}
    </main>
  );
}
