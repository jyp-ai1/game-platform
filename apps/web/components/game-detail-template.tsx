import { Container } from "@game-platform/ui";
import type { Game, GameStatus } from "@game-platform/shared";

import { GameDetailAchievements } from "@/components/game-detail-achievements";
import {
  GameDetailMyRecord,
  GameDetailTop3,
} from "@/components/game-detail-compact-stats";
import {
  GameDetailComments,
  GameDetailRating,
} from "@/components/game-detail-extras";
import { GameDetailHero } from "@/components/game-detail-hero";
import { GameDetailSimilar } from "@/components/game-detail-similar";
import { GameDetailStage } from "@/components/game-detail-stage";
import { GamePlayer } from "@/components/game-player";
import { GameStatusBlock } from "@/components/game-status-block";
import { RecentlyPlayedRecorder } from "@/components/recently-played-recorder";
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
  return (
    <main className="flex flex-1 flex-col">
      <Container className="max-w-4xl space-y-5 py-5 sm:py-6">
        <GameDetailHero game={game} />

        {isPlayable ? (
          <>
            <RecentlyPlayedRecorder
              slug={slug}
              categorySlug={game.category?.slug ?? null}
              difficulty={game.difficulty}
            />
            <GameDetailStage>
              <GamePlayer slug={slug as PlayableSlug} rankingEnabled={rankingEnabled} />
            </GameDetailStage>

            {rankingEnabled ? (
              <>
                <GameDetailTop3 gameSlug={slug} />
                <GameDetailMyRecord gameSlug={slug} difficulty={game.difficulty} />
              </>
            ) : null}

            <GameDetailAchievements />

            <div className="grid gap-4 sm:grid-cols-2">
              <GameDetailRating gameSlug={slug} />
              <GameDetailComments gameSlug={slug} />
            </div>

            <GameDetailSimilar games={allGames} related={related} />
          </>
        ) : game.status !== "ACTIVE" ? (
          <GameStatusBlock status={game.status as Exclude<GameStatus, "ACTIVE">} />
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </Container>
    </main>
  );
}
