import { Container } from "@game-platform/ui";
import type { Game, GameStatus } from "@game-platform/shared";

import { GameDetailComments } from "@/components/game-detail-extras";
import { GameDetailFriendRecord } from "@/components/game-detail-friend-record";
import { GameDetailHero } from "@/components/game-detail-hero";
import { SnakeMultiplayerEntry } from "@/components/snake-multiplayer-entry";
import { GameDetailGlobalRanking } from "@/components/game-detail-global-ranking";
import { GameDetailPatchNotes } from "@/components/game-detail-patch-notes";
import { GameDetailStage } from "@/components/game-detail-stage";
import { RuntimeProvider } from "@/components/runtime-provider";
import { GamePlayer } from "@/components/game-player";
import { GameStatusBlock } from "@/components/game-status-block";
import { RecentlyPlayedRecorder } from "@/components/recently-played-recorder";
import type { PlayableSlug } from "@/lib/playable-games";

function shortDescription(game: Game, slug: string): string {
  if (slug === "snake") {
    return "다른 플레이어와 경쟁하며 가장 긴 뱀이 되어보세요. 보석을 먹고 성장하며 살아남으세요.";
  }
  const raw = game.description?.trim();
  if (!raw) return "방향키와 버튼으로 플레이하세요.";
  const first = raw.split(/[.!?]\s/)[0] ?? raw;
  return first.length > 120 ? `${first.slice(0, 117)}…` : first;
}

export function GameDetailTemplate({
  game,
  slug,
  isPlayable,
  rankingEnabled = true,
  related: _related = [],
  allGames = [],
}: {
  game: Game;
  slug: string;
  isPlayable: boolean;
  rankingEnabled?: boolean;
  related?: Game[];
  allGames?: Game[];
}) {
  const desc = shortDescription(game, slug);

  return (
    <main className="flex flex-1 flex-col">
      <Container className="max-w-3xl space-y-5 py-5 sm:py-6">
        <GameDetailHero game={game} />

        {isPlayable ? (
          <>
            <section className="space-y-4 text-center">
              <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">{desc}</p>
              {slug === "snake" ? (
                <SnakeMultiplayerEntry variant="start" />
              ) : (
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
                </>
              )}
            </section>

            <hr className="border-white/10" />

            {rankingEnabled ? <GameDetailGlobalRanking gameSlug={slug} /> : null}
            <GameDetailFriendRecord gameSlug={slug} />
            <GameDetailComments gameSlug={slug} />
            <GameDetailPatchNotes game={game} />
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
