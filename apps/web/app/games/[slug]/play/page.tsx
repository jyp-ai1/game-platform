import { GamePlayClient } from "@/components/game-play-client";
import { buildLocalMvpGame } from "@/lib/local-mvp-games";
import { isPlayableSlug } from "@/lib/playable-games";
import { getGameBySlug } from "@/lib/supabase/games";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

interface GamePlayPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: GamePlayPageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = (await getGameBySlug(slug)) ?? buildLocalMvpGame(slug);
  return { title: game?.title ? `${game.title} — Play` : "Play" };
}

/**
 * Fullscreen play shell.
 * Local MVP slugs (agar/bomber) must resolve even when Supabase has no row —
 * otherwise detail CTA → /play soft-404s (CEO "cannot play").
 * Snake flagship lives at /flagship/snake-io/play — redirect so /games/snake/play works too.
 */
export default async function GamePlayPage({ params, searchParams }: GamePlayPageProps) {
  const { slug } = await params;
  if (!isPlayableSlug(slug)) {
    notFound();
  }

  if (slug === "snake") {
    const q = await searchParams;
    // invite= maps to the same room join path as room=
    const room =
      firstParam(q.room)?.toUpperCase() ||
      firstParam(q.invite)?.toUpperCase() ||
      "WORLD";
    const fromInvite =
      !!firstParam(q.invite) || firstParam(q.source)?.toLowerCase() === "invite";
    const debug = firstParam(q.debug) === "1" ? "&debug=1" : "";
    const source = fromInvite ? "&source=invite" : "";
    redirect(
      `/flagship/snake-io/play?room=${encodeURIComponent(room)}${source}${debug}`
    );
  }

  const game = (await getGameBySlug(slug)) ?? buildLocalMvpGame(slug);
  if (!game || game.status !== "ACTIVE") {
    notFound();
  }

  return (
    <main className="fixed inset-0 z-[100] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-black">
      <GamePlayClient slug={slug} title={game.title} />
    </main>
  );
}
