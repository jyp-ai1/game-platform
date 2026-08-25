import { Container } from "@game-platform/ui";
import type { Game, GameStatus } from "@game-platform/shared";
import Link from "next/link";

import { GameDetailComments } from "@/components/game-detail-extras";
import { GameDetailFriendRecord } from "@/components/game-detail-friend-record";
import { GameDetailHero } from "@/components/game-detail-hero";
import { SnakeMultiplayerEntry } from "@/components/snake-multiplayer-entry";
import { GameDetailGlobalRanking } from "@/components/game-detail-global-ranking";
import { GameDetailPatchNotes } from "@/components/game-detail-patch-notes";
import { GameStatusBlock } from "@/components/game-status-block";

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
                <Link
                  href={
                    slug === "agar"
                      ? "/games/agar/play?room=WORLD"
                      : slug === "bomber"
                        ? "/games/bomber/play?room=ROOM"
                        : `/games/${slug}/play`
                  }
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-10 py-3 text-base font-bold text-primary-foreground shadow-lg transition hover:brightness-110"
                >
                  Play
                </Link>
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
