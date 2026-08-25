import { GamePlayClient } from "@/components/game-play-client";
import { isPlayableSlug } from "@/lib/playable-games";
import { getGameBySlug } from "@/lib/supabase/games";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface GamePlayPageProps {
  params: Promise<{ slug: string }>;
}

/** Local MVP scaffolds may ship before Supabase catalog row exists. */
const LOCAL_MVP_TITLES: Record<string, string> = {
  bomber: "Bomber",
};

export async function generateMetadata({ params }: GamePlayPageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  const title = game?.title ?? LOCAL_MVP_TITLES[slug];
  return { title: title ? `${title} — Play` : "Play" };
}

/** Fullscreen instant-play shell — no scroll, no extra gates (RC-008). */
export default async function GamePlayPage({ params }: GamePlayPageProps) {
  const { slug } = await params;
  if (!isPlayableSlug(slug)) {
    notFound();
  }
  const game = await getGameBySlug(slug);
  const localTitle = LOCAL_MVP_TITLES[slug];
  if ((!game || game.status !== "ACTIVE") && !localTitle) {
    notFound();
  }

  return (
    <main className="fixed inset-0 z-[100] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-black">
      <GamePlayClient slug={slug} title={game?.title ?? localTitle ?? slug} />
    </main>
  );
}
