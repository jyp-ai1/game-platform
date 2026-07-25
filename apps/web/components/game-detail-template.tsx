import { Badge, Container } from "@game-platform/ui";
import type { Game, GameStatus } from "@game-platform/shared";
import Link from "next/link";

import { FavoriteButton } from "@/components/favorite-button";
import {
  GameDetailComments,
  GameDetailNextGame,
  GameDetailRating,
} from "@/components/game-detail-extras";
import { GameDetailRecentStrip } from "@/components/game-detail-recent-strip";
import { GameDetailStage } from "@/components/game-detail-stage";
import { GameDetailStatsPanel } from "@/components/game-detail-stats-panel";
import { GamePlayer } from "@/components/game-player";
import { GameStatusBlock } from "@/components/game-status-block";
import { RecentlyPlayedRecorder } from "@/components/recently-played-recorder";
import { difficultyVariant, formatDifficulty } from "@/lib/difficulty";
import { getGameBalanceMeta } from "@/lib/game-balance";
import type { PlayableSlug } from "@/lib/playable-games";

export function GameDetailTemplate({
  game,
  slug,
  isPlayable,
  rankingEnabled = true,
  related = [],
  allGames = [],
}: {
  game: Game;
  slug: string;
  isPlayable: boolean;
  rankingEnabled?: boolean;
  related?: Game[];
  allGames?: Game[];
}) {
  const balance = getGameBalanceMeta(game.slug, game.difficulty);
  const nextGame = related[0] ?? null;

  return (
    <main className="flex flex-1 flex-col">
      <Container className="max-w-4xl py-6 sm:py-8">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold sm:text-3xl">{game.title}</h1>
          <FavoriteButton slug={game.slug} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant={difficultyVariant[game.difficulty]}>
            {formatDifficulty(game.difficulty)}
          </Badge>
          <Badge variant="outline">{balance.playTimeLabel}</Badge>
          {game.category ? (
            <Link href={`/categories/${game.category.slug}`}>
              <Badge variant="secondary">{game.category.name}</Badge>
            </Link>
          ) : null}
        </div>

        {isPlayable ? (
          <div className="mt-6 space-y-8">
            <RecentlyPlayedRecorder
              slug={slug}
              categorySlug={game.category?.slug ?? null}
              difficulty={game.difficulty}
            />
            <GameDetailStage>
              <GamePlayer slug={slug as PlayableSlug} rankingEnabled={rankingEnabled} />
            </GameDetailStage>

            {rankingEnabled ? (
              <GameDetailStatsPanel gameSlug={slug} difficulty={game.difficulty} />
            ) : null}

            <GameDetailRecentStrip games={allGames} currentSlug={slug} />

            <div className="grid gap-4 sm:grid-cols-2">
              <GameDetailRating gameSlug={slug} />
              <GameDetailComments gameSlug={slug} />
            </div>

            <GameDetailNextGame next={nextGame} />
          </div>
        ) : game.status !== "ACTIVE" ? (
          <div className="mt-8">
            <GameStatusBlock status={game.status as Exclude<GameStatus, "ACTIVE">} />
          </div>
        ) : (
          <p className="mt-8 text-sm text-muted-foreground">플레이 불가</p>
        )}
      </Container>
    </main>
  );
}
