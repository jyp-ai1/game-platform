import { SnakeIoPlayClientRoot } from "@/components/snake-io-play-client";
import { getGameBySlug } from "@/lib/supabase/games";
import { Suspense } from "react";

export const metadata = { title: "Replay Snake.io — Play" };

export default async function SnakeIoPlayPage() {
  const game = await getGameBySlug("snake");

  return (
    <main className="fixed inset-0 z-[100] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-black">
      <Suspense fallback={<p className="py-8 text-center text-muted-foreground">Loading…</p>}>
        <SnakeIoPlayClientRoot showMetaAfterExit={!!game} game={game ?? undefined} />
      </Suspense>
    </main>
  );
}
