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
  GameDetailShare,
} from "@/components/game-detail-extras";
import { GameDetailHero } from "@/components/game-detail-hero";
import { GameDetailJourneyStrip } from "@/components/game-detail-journey-strip";
import { GameDetailSimilar } from "@/components/game-detail-similar";
import { GameDetailStagePanel } from "@/components/game-detail-stage-panel";
import { GameDetailStage } from "@/components/game-detail-stage";
import { GameLifecycleBridge } from "@/components/game-lifecycle-bridge";
import { GamePlayer } from "@/components/game-player";
import { GameStatusBlock } from "@/components/game-status-block";
import { MultiplayerInvitePanel } from "@/components/multiplayer-invite-panel";
import { RecentlyPlayedRecorder } from "@/components/recently-played-recorder";
import { UniversalGameRuntime } from "@/components/universal-game-runtime";
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
            <GameLifecycleBridge slug={slug} games={allGames}>
              <GameDetailStage>
                <UniversalGameRuntime slug={slug}>
                  <GamePlayer slug={slug as PlayableSlug} rankingEnabled={rankingEnabled} />
                </UniversalGameRuntime>
              </GameDetailStage>
            </GameLifecycleBridge>

            {rankingEnabled ? (
              <>
                <GameDetailTop3 gameSlug={slug} />
                <GameDetailMyRecord gameSlug={slug} difficulty={game.difficulty} />
              </>
            ) : null}

            <GameDetailAchievements />
            <GameDetailStagePanel slug={slug} difficulty={game.difficulty} />
            <GameDetailJourneyStrip slug={slug} />
            <MultiplayerInvitePanel game={game} />

            <div className="grid gap-4 sm:grid-cols-2">
              <GameDetailRating gameSlug={slug} />
              <GameDetailComments gameSlug={slug} />
            </div>

            <GameDetailSimilar games={allGames} related={related} />
            <GameDetailShare gameSlug={slug} title={game.title} challengeMode />
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
