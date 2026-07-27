"use client";

import type { Game } from "@game-platform/shared";
import { Container } from "@game-platform/ui";

import { GameDetailComments } from "@/components/game-detail-extras";
import { GameDetailFriendRecord } from "@/components/game-detail-friend-record";
import { GameDetailGlobalRanking } from "@/components/game-detail-global-ranking";
import { GameDetailPatchNotes } from "@/components/game-detail-patch-notes";
import { replayCard } from "@/lib/replay-os";

/** Play page meta — simplified bottom structure (no trailer). */
export function SnakeIoPlayMeta({ game }: { game: Game }) {
  return (
    <Container className="max-w-3xl space-y-5 pb-8 pt-4">
      <section className={replayCard("p-5 text-center")}>
        <h3 className="font-semibold">{game.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {game.description ??
            "다른 플레이어와 경쟁하며 가장 긴 뱀이 되어보세요. 보석을 먹고 성장하며 살아남으세요."}
        </p>
      </section>

      <GameDetailComments gameSlug="snake" />
      <GameDetailFriendRecord gameSlug="snake" />
      <GameDetailGlobalRanking gameSlug="snake" />
      <GameDetailPatchNotes game={game} />
    </Container>
  );
}
