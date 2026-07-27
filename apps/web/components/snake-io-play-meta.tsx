"use client";

import type { Game } from "@game-platform/shared";
import { Container } from "@game-platform/ui";

import {
  GameDetailComments,
  GameDetailRating,
  GameDetailShare,
} from "@/components/game-detail-extras";
import { GameDetailFriendRecord } from "@/components/game-detail-friend-record";
import { GameDetailGlobalRanking } from "@/components/game-detail-global-ranking";
import { GameDetailMetaPanel, GameDetailTrailer } from "@/components/game-detail-meta-panel";
import { GameDetailSimilar } from "@/components/game-detail-similar";
import { MultiplayerInvitePanel } from "@/components/multiplayer-invite-panel";
import { replayCard } from "@/lib/replay-os";

/** Play page meta — same bottom structure as standard game detail. */
export function SnakeIoPlayMeta({
  game,
  related = [],
  allGames = [],
}: {
  game: Game;
  related?: Game[];
  allGames?: Game[];
}) {
  return (
    <Container className="max-w-3xl space-y-5 pb-8 pt-4">
      <GameDetailTrailer game={game} />

      <section className={replayCard("p-5")}>
        <h3 className="font-semibold">Description</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {game.description ?? "Replay Snake.io — Global World 멀티플레이. 친구와 같은 WORLD 룸에 입장해 실시간 대전하세요."}
        </p>
        <h4 className="mt-4 text-sm font-semibold">Controls</h4>
        <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
          <li>WASD / 방향키 — 이동</li>
          <li>Space / Boost 버튼 — 부스트 (1.2x)</li>
          <li>죽음 후 Retry 버튼 — 재시작</li>
        </ul>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <GameDetailGlobalRanking gameSlug="snake" />
        <GameDetailFriendRecord gameSlug="snake" />
      </div>

      <GameDetailComments gameSlug="snake" />
      <MultiplayerInvitePanel game={game} />
      <GameDetailSimilar games={allGames} related={related.length ? related : allGames.filter((g) => g.slug !== "snake").slice(0, 6)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <GameDetailRating gameSlug="snake" />
        <GameDetailShare gameSlug="snake" title={game.title} challengeMode />
      </div>
      <GameDetailMetaPanel game={game} />
    </Container>
  );
}
