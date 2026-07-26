import type { GameRoom, MultiplayerResultPayload } from "@game-platform/shared";

/** Build universal multiplayer result from finished room. */
export function buildMultiplayerResult(room: GameRoom): MultiplayerResultPayload {
  const sorted = [...room.players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const winner = sorted[0];
  const baseXp = 25;
  const winBonus = winner ? 15 : 0;
  const coinBase = 10;

  return {
    winnerId: winner?.deviceId ?? null,
    winnerNickname: winner?.nickname ?? null,
    scores: room.players.map((p) => ({
      deviceId: p.deviceId,
      nickname: p.nickname,
      score: p.score ?? 0,
    })),
    xp: baseXp + winBonus,
    coins: coinBase + (winner ? 5 : 0),
    replayScoreDelta: winner ? 12 : 4,
    roomCode: room.code,
    gameSlug: room.gameSlug,
  };
}

export type { MultiplayerResultPayload };
