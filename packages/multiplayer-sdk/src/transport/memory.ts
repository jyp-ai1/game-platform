/**
 * In-memory transport — unit tests only (no localStorage).
 */
import { getDeviceId, getLastNickname } from "@game-platform/game-sdk";
import type { GameRoom, MatchResult } from "@game-platform/shared";

import { cacheGet, cacheSet, cacheRemove, randomCode, subscribeCache } from "./cache";
import type { CreateRoomParams, JoinRoomOptions, MultiplayerTransport } from "./interface";

function apply(code: string, mutator: (room: GameRoom) => GameRoom | null): GameRoom | null {
  const room = cacheGet(code);
  if (!room) return null;
  const next = mutator(room);
  if (next) cacheSet(next);
  return next;
}

export const memoryTransport: MultiplayerTransport = {
  createRoom(params: CreateRoomParams): GameRoom {
    const deviceId = getDeviceId();
    const nickname = params.hostNickname ?? getLastNickname() ?? "Player";
    const room: GameRoom = {
      code: (params.code ?? randomCode()).toUpperCase(),
      gameSlug: params.gameSlug,
      hostId: deviceId,
      maxPlayers: params.maxPlayers ?? 8,
      players: [{ deviceId, nickname, ready: true, reconnectToken: deviceId.slice(0, 8) }],
      spectators: [],
      status: "waiting",
      countdown: 3,
      matchMode: params.matchMode ?? "private",
      createdAt: new Date().toISOString(),
    };
    cacheSet(room);
    return room;
  },

  joinRoom(code: string, options?: JoinRoomOptions): GameRoom | null {
    const room = cacheGet(code);
    if (!room || room.players.length >= room.maxPlayers) return null;
    const deviceId = getDeviceId();
    if (room.players.some((p) => p.deviceId === deviceId)) {
      if (room.spectators.includes(deviceId)) {
        cacheSet({ ...room, spectators: room.spectators.filter((id) => id !== deviceId) });
      }
      return room;
    }
    const next = {
      ...room,
      players: [...room.players, {
        deviceId,
        nickname: options?.nickname ?? "Guest",
        ready: false,
        isGuest: options?.isGuest,
        reconnectToken: deviceId.slice(0, 8),
      }],
    };
    cacheSet(next);
    return next;
  },

  leaveRoom(code: string): void {
    const room = cacheGet(code);
    if (!room) return;
    const deviceId = getDeviceId();
    const players = room.players.filter((p) => p.deviceId !== deviceId);
    if (players.length === 0) cacheRemove(code);
    else cacheSet({ ...room, players, hostId: room.hostId === deviceId ? players[0]!.deviceId : room.hostId });
  },

  getRoom: cacheGet,
  setPlayerReady(code, ready) {
    return apply(code, (room) => {
      const deviceId = getDeviceId();
      const players = room.players.map((p) => (p.deviceId === deviceId ? { ...p, ready } : p));
      const allReady = players.every((p) => p.ready) && players.length >= 2;
      return { ...room, players, status: allReady ? "ready" : room.status, countdown: allReady ? 3 : room.countdown };
    });
  },
  send(code, event, payload) {
    return apply(code, (room) => ({
      ...room,
      gameState: { ...(room.gameState ?? {}), [event]: payload, _lastEvent: event, _updatedAt: new Date().toISOString() },
    }));
  },
  sync: cacheGet,
  start(code) {
    return apply(code, (room) => ({ ...room, status: "playing", startedAt: new Date().toISOString(), countdown: 0 }));
  },
  finish(code, result: MatchResult) {
    return apply(code, (room) => ({
      ...room,
      status: "finished",
      finishedAt: result.finishedAt,
      players: room.players.map((p) => ({ ...p, score: result.scores[p.deviceId] ?? p.score })),
    }));
  },
  joinAsSpectator(code) {
    return apply(code, (room) => {
      const deviceId = getDeviceId();
      return room.spectators.includes(deviceId) ? room : { ...room, spectators: [...room.spectators, deviceId] };
    });
  },
  reconnect(code, token) {
    const room = cacheGet(code);
    if (room?.players.some((p) => p.reconnectToken === token)) return room;
    return memoryTransport.joinRoom(code);
  },
  tickCountdown(code) {
    return apply(code, (room) => {
      if (room.status !== "ready" || room.countdown <= 0) return room;
      const countdown = room.countdown - 1;
      return countdown === 0
        ? { ...room, countdown: 0, status: "playing", startedAt: new Date().toISOString() }
        : { ...room, countdown };
    });
  },
  subscribe: subscribeCache,
};
