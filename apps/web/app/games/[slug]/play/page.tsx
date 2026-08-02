import { GamePlayClient } from "@/components/game-play-client";
import { isPlayableSlug } from "@/lib/playable-games";
import { getGameBySlug } from "@/lib/supabase/games";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface GamePlayPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: GamePlayPageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  return { title: game ? `${game.title} — Play` : "Play" };
}

/** Fullscreen instant-play shell — no scroll, no extra gates (RC-008). */
export default async function GamePlayPage({ params }: GamePlayPageProps) {
  const { slug } = await params;
  if (!isPlayableSlug(slug)) {
    notFound();
  }
  const game = await getGameBySlug(slug);
  if (!game || game.status !== "ACTIVE") {
    notFound();
  }

  return (
    <main className="fixed inset-0 z-[100] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-black">
      <GamePlayClient slug={slug} title={game.title} />
    </main>
  );
}
