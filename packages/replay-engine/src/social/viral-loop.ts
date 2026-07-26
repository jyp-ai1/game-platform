/** Viral Loop — complete multiplayer match and connect party → friends → journey. */
import { getDeviceId } from "@game-platform/game-sdk";
import { buildMultiplayerResult } from "@game-platform/multiplayer-sdk";
import type { GameRoom, MultiplayerResultPayload } from "@game-platform/shared";

import { nextContinueGame } from "./constants";
import { recordCoPlay } from "./friends";
import { finishPartyGame, getActivePartyId, getMyParty, queuePartyGame, travelToGame } from "./party";
import { appendPartyJourney } from "./party-journey";
import { advancePartyMissions } from "./party-mission";
import { recordRecentGame } from "./recommend";
import { recordCrossGameScore } from "./ranking";

export interface ViralLoopResult {
  result: MultiplayerResultPayload;
  partyId: string | null;
  nextGame: { slug: string; label: string; href: string };
}

/** Complete match — party persist, friends, missions, journey, ranking. */
export async function completeMultiplayerMatch(room: GameRoom): Promise<ViralLoopResult> {
  const result = buildMultiplayerResult(room);
  const myId = getDeviceId();
  const won = result.winnerId === myId;
  const totalScore = Object.values(
    room.players.reduce<Record<string, number>>((acc, p) => {
      acc[p.deviceId] = p.score ?? 0;
      return acc;
    }, {})
  ).reduce((a, b) => a + b, 0);

  recordRecentGame(room.gameSlug);
  recordCrossGameScore(myId, room.players.find((p) => p.deviceId === myId)?.nickname ?? "Player", room.gameSlug, result.scores.find((s) => s.deviceId === myId)?.score ?? 0);

  for (const p of room.players) {
    if (p.deviceId === myId) continue;
    recordCoPlay(p.deviceId, p.nickname, room.gameSlug, won ? "win" : p.deviceId === result.winnerId ? "loss" : "draw");
    recordCrossGameScore(p.deviceId, p.nickname, room.gameSlug, p.score ?? 0);
  }

  const partyId = getActivePartyId();
  let party = partyId ? await finishPartyGame(partyId, room.players.length, {
    winnerId: result.winnerId ?? undefined,
    scores: result.scores.reduce<Record<string, number>>((acc, s) => { acc[s.deviceId] = s.score; return acc; }, {}),
    gameSlug: room.gameSlug,
    totalScore,
    won,
  }) : null;

  if (party) {
    appendPartyJourney(party.id, {
      kind: "game",
      title: `${room.gameSlug.replace(/-/g, " ")} 완료`,
      gameSlug: room.gameSlug,
    });
    if (party.progress.streak >= 3) {
      appendPartyJourney(party.id, { kind: "streak", title: `${party.progress.streak}일 연속`, gameSlug: room.gameSlug });
    }
  }

  const nextGame = nextContinueGame(room.gameSlug);
  return { result, partyId: party?.id ?? null, nextGame };
}

/** Leader queues and travels to next game together. */
export async function continueTogether(partyId: string, gameSlug?: string): Promise<{ roomCode: string } | null> {
  const party = await getMyParty();
  if (!party || party.id !== partyId) return null;
  const slug = gameSlug ?? nextContinueGame(party.history.at(-1)?.gameSlug ?? "snake").slug;
  await queuePartyGame(partyId, slug);
  const travel = await travelToGame(partyId, slug);
  if (!travel) return null;
  appendPartyJourney(partyId, { kind: "game", title: `${slug.replace(/-/g, " ")} 이동`, gameSlug: slug });
  return { roomCode: travel.roomCode };
}

/** Rematch same game in party context. */
export async function rematchTogether(partyId: string, gameSlug: string): Promise<{ roomCode: string } | null> {
  const travel = await travelToGame(partyId, gameSlug);
  if (!travel) return null;
  return { roomCode: travel.roomCode };
}

export const ViralLoopEngine = {
  complete: completeMultiplayerMatch,
  continue: continueTogether,
  rematch: rematchTogether,
};
