import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GameDetailTemplate } from "@/components/game-detail-template";
import { JsonLdScript } from "@/components/json-ld-script";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { selectMoreGames } from "@/lib/game-sections";
import {
  buildLocalMvpGame,
  getGameOrLocalMvp,
} from "@/lib/local-mvp-games";
import {
  getCreatorGameOrNull,
  mergeCatalogGames,
} from "@/lib/creator/creator-game-catalog";
import { isCreatorPlayableSlug } from "@/lib/creator/creator-play-resolver";
import { isPlayableSlug } from "@/lib/playable-games";
import {
  breadcrumbJsonLd,
  buildGameMetadata,
  gameFaqJsonLd,
  gameJsonLd,
  softwareApplicationJsonLd,
} from "@/lib/seo";
import { getGameBySlug, getGames, isExternalGame } from "@/lib/supabase/games";

interface GamePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export const revalidate = 60;

export async function generateMetadata({
  params,
}: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = (await getGameBySlug(slug)) ?? buildLocalMvpGame(slug);

  if (!game) {
    return { title: "Game Not Found", robots: { index: false, follow: false } };
  }

  return buildGameMetadata(game);
}

export default async function GamePage({ params, searchParams }: GamePageProps) {
  const { slug } = await params;
  const q = await searchParams;
  // Sprint 21 — Invite lands on Detail (pin room via InviteDetailPin), then WORLD PLAY.
  // Do not auto-redirect past Detail (same-world join still uses pinned room).
  const invite =
    firstParam(q.invite)?.trim().toUpperCase() ||
    firstParam(q.room)?.trim().toUpperCase() ||
    null;

  const [dbGame, rawGames, rankingEnabled] = await Promise.all([
    getGameBySlug(slug),
    getGames(),
    isFeatureEnabled("ranking"),
  ]);
  const allGames = mergeCatalogGames(rawGames);
  const game = dbGame
    ? getGameOrLocalMvp([dbGame], slug)
    : getGameOrLocalMvp(allGames, slug) ?? getCreatorGameOrNull(slug);

  if (!game || game.status === "HIDDEN") {
    notFound();
  }

  const moreGames = selectMoreGames(allGames, game, 3);
  const isPlayable =
    (game.status === "ACTIVE" && isPlayableSlug(slug)) ||
    isCreatorPlayableSlug(slug) ||
    (game.status === "ACTIVE" && isExternalGame(game));

  return (
    <>
      <JsonLdScript
        data={[
          gameJsonLd(game),
          softwareApplicationJsonLd(game),
          gameFaqJsonLd(game),
          breadcrumbJsonLd([
            { name: "홈", path: "/" },
            { name: "게임", path: "/games" },
            { name: game.title, path: `/games/${game.slug}` },
          ]),
        ]}
      />
      <GameDetailTemplate
        game={game}
        slug={slug}
        isPlayable={isPlayable}
        rankingEnabled={rankingEnabled}
        related={moreGames}
        allGames={allGames}
        inviteCode={invite}
      />
    </>
  );
}
