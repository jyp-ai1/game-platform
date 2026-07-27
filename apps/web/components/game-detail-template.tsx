import { Container } from "@game-platform/ui";
import type { Game, GameStatus } from "@game-platform/shared";

import { GameDetailAchievements } from "@/components/game-detail-achievements";
import { GameDetailAiSummary } from "@/components/game-detail-ai-summary";
import { GameDetailCollectionPanel } from "@/components/game-detail-collection-panel";
import {
  GameDetailMyRecord,
  GameDetailTop3,
} from "@/components/game-detail-compact-stats";
import {
  GameDetailComments,
  GameDetailRating,
  GameDetailShare,
} from "@/components/game-detail-extras";
import { GameDetailFriendRecord } from "@/components/game-detail-friend-record";
import { GameDetailHero } from "@/components/game-detail-hero";
import { SnakeMultiplayerEntry } from "@/components/snake-multiplayer-entry";
import { GameDetailJourneyStrip } from "@/components/game-detail-journey-strip";
import { GameDetailGlobalRanking } from "@/components/game-detail-global-ranking";
import { GameDetailMetaPanel, GameDetailTrailer } from "@/components/game-detail-meta-panel";
import { GameDetailPatchNotes } from "@/components/game-detail-patch-notes";
import { GameDetailMissionPanel } from "@/components/game-detail-mission-panel";
import { GameDetailSimilar } from "@/components/game-detail-similar";
import { GameDetailStagePanel } from "@/components/game-detail-stage-panel";
import { GameDetailStage } from "@/components/game-detail-stage";
import { RuntimeProvider } from "@/components/runtime-provider";
import { GamePlayer } from "@/components/game-player";
import { GameStatusBlock } from "@/components/game-status-block";
import { MultiplayerInvitePanel } from "@/components/multiplayer-invite-panel";
import { RemixPanel } from "@/components/remix-panel";
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

        {slug === "snake" ? <SnakeMultiplayerEntry variant="detail" /> : null}

        {isPlayable ? (
          <>
            <RecentlyPlayedRecorder
              slug={slug}
              categorySlug={game.category?.slug ?? null}
              difficulty={game.difficulty}
            />
            <RuntimeProvider slug={slug} games={allGames}>
              <GameDetailStage>
                <GamePlayer slug={slug as PlayableSlug} rankingEnabled={rankingEnabled} />
              </GameDetailStage>
            </RuntimeProvider>

            <GameDetailTrailer game={game} />
          </>
        ) : null}

        {slug !== "snake" ? <GameDetailTrailer game={game} /> : null}

        {isPlayable ? (
          <>
            {rankingEnabled ? (
              <>
                <GameDetailTop3 gameSlug={slug} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <GameDetailMyRecord gameSlug={slug} difficulty={game.difficulty} />
                  <GameDetailGlobalRanking gameSlug={slug} />
                </div>
                <GameDetailFriendRecord gameSlug={slug} />
              </>
            ) : null}

            <GameDetailComments gameSlug={slug} />
            <GameDetailAchievements />
            <GameDetailCollectionPanel gameSlug={slug} />
            <GameDetailAiSummary gameSlug={slug} />
            <GameDetailStagePanel slug={slug} difficulty={game.difficulty} />
            <GameDetailMissionPanel gameSlug={slug} />
            <GameDetailJourneyStrip slug={slug} />
            <MultiplayerInvitePanel game={game} />
            <RemixPanel baseSlug={slug} baseTitle={game.title} />

            <GameDetailSimilar games={allGames} related={related} />
            <div className="grid gap-4 sm:grid-cols-2">
              <GameDetailRating gameSlug={slug} />
            </div>
            <GameDetailMetaPanel game={game} />
            <GameDetailPatchNotes game={game} />
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
