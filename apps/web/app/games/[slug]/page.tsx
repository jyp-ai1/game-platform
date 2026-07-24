import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GameDetailTemplate } from "@/components/game-detail-template";
import { GameSection } from "@/components/game-section";
import { JsonLdScript } from "@/components/json-ld-script";
import { selectHotSlugs, selectRelated } from "@/lib/game-sections";
import { isPlayableSlug } from "@/lib/playable-games";
import {
  breadcrumbJsonLd,
  buildGameMetadata,
  gameJsonLd,
  softwareApplicationJsonLd,
} from "@/lib/seo";
import { getGameBySlug, getGames } from "@/lib/supabase/games";

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateMetadata({
  params,
}: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) {
    return { title: "Game Not Found", robots: { index: false, follow: false } };
  }

  return buildGameMetadata(game);
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const [game, allGames] = await Promise.all([getGameBySlug(slug), getGames()]);

  if (!game || game.status === "HIDDEN") {
    notFound();
  }

  const related = selectRelated(allGames, game);
  const hotSlugs = selectHotSlugs(allGames);
  const isPlayable = game.status === "ACTIVE" && isPlayableSlug(slug);

  return (
    <>
      <JsonLdScript
        data={[
          gameJsonLd(game),
          softwareApplicationJsonLd(game),
          breadcrumbJsonLd([
            { name: "홈", path: "/" },
            { name: "게임", path: "/games" },
            { name: game.title, path: `/games/${game.slug}` },
          ]),
        ]}
      />
      <GameDetailTemplate game={game} slug={slug} isPlayable={isPlayable} />
      <GameSection title="비슷한 게임" games={related} hotSlugs={hotSlugs} />
    </>
  );
}
