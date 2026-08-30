/**
 * Supabase Realtime transport — cross-device multiplayer (L2 Engine P0).
 * Postgres persistence + Realtime broadcast for low-latency sync.
 */
import { getDeviceId, getLastNickname } from "@game-platform/game-sdk";
import type { GameRoom, MatchResult, RoomPlayer } from "@game-platform/shared";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { cacheGet, cacheSet, cacheRemove, notify, randomCode, subscribeCache } from "./cache";
import type { CreateRoomParams, JoinRoomOptions, MultiplayerTransport } from "./interface";
import { getMultiplayerSupabase } from "./supabase-client";

interface MpRoomRow {
  code: string;
  game_slug: string;
  host_id: string;
  max_players: number;
  players: RoomPlayer[];
  spectators: string[];
  status: GameRoom["status"];
  countdown: number;
  match_mode: GameRoom["matchMode"];
  game_state: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

const channels = new Map<string, RealtimeChannel>();
const fetchPromises = new Map<string, Promise<GameRoom | null>>();

function rowToRoom(row: MpRoomRow): GameRoom {
  return {
    code: row.code,
    gameSlug: row.game_slug,
    hostId: row.host_id,
    maxPlayers: row.max_players as GameRoom["maxPlayers"],
    players: row.players ?? [],
    spectators: row.spectators ?? [],
    status: row.status,
    countdown: row.countdown,
    matchMode: row.match_mode,
    createdAt: row.created_at,
    startedAt: row.started_at ?? undefined,
    finishedAt: row.finished_at ?? undefined,
    gameState: row.game_state ?? undefined,
  };
}

function roomToRow(room: GameRoom): MpRoomRow {
  return {
    code: room.code.toUpperCase(),
    game_slug: room.gameSlug,
    host_id: room.hostId,
    max_players: room.maxPlayers,
    players: room.players,
    spectators: room.spectators,
    status: room.status,
    countdown: room.countdown,
    match_mode: room.matchMode,
    game_state: room.gameState ?? null,
    created_at: room.createdAt,
    started_at: room.startedAt ?? null,
    finished_at: room.finishedAt ?? null,
  };
}

async function persistRoom(room: GameRoom): Promise<void> {
  const supabase = getMultiplayerSupabase();
  if (!supabase) return;
  const key = room.code.toUpperCase();
  // Merge players on upsert so invite create/join races do not wipe the other device.
  let players = room.players;
  let hostId = room.hostId;
  try {
    const { data: existing } = await supabase
      .from("mp_rooms")
      .select("players,host_id")
      .eq("code", key)
      .maybeSingle();
    if (existing?.players && Array.isArray(existing.players)) {
      const byId = new Map<string, RoomPlayer>();
      for (const p of existing.players as RoomPlayer[]) {
        if (p?.deviceId) byId.set(p.deviceId, p);
      }
      for (const p of room.players) {
        if (p?.deviceId) byId.set(p.deviceId, p);
      }
      players = Array.from(byId.values());
      const existingHost = existing.host_id as string | undefined;
      if (existingHost && players.some((p) => p.deviceId === existingHost)) {
        hostId = existingHost;
      }
    }
  } catch {
    /* best-effort merge */
  }
  const merged: GameRoom = { ...room, players, hostId };
  const row = roomToRow(merged);
  // Strip heavy ephemeral sim blobs from Postgres (broadcast carries them).
  if (row.game_state) {
    const gs = { ...row.game_state };
    delete gs.state;
    for (const k of Object.keys(gs)) {
      if (k.startsWith("peer:") || k.startsWith("input:")) delete gs[k];
    }
    row.game_state = Object.keys(gs).length ? gs : null;
  }
  await supabase.from("mp_rooms").upsert({ ...row, updated_at: new Date().toISOString() });
  cacheSet(merged);
}

async function deleteRoom(code: string): Promise<void> {
  const supabase = getMultiplayerSupabase();
  if (!supabase) return;
  await supabase.from("mp_rooms").delete().eq("code", code.toUpperCase());
}

export async function fetchRoomFromSupabase(code: string): Promise<GameRoom | null> {
  const key = code.toUpperCase();
  const cached = cacheGet(key);
  if (cached) return cached;

  const pending = fetchPromises.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const supabase = getMultiplayerSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("mp_rooms")
      .select("*")
      .eq("code", key)
      .maybeSingle();
    if (error || !data) return null;
    const room = rowToRoom(data as MpRoomRow);
    cacheSet(room);
    ensureChannel(room.code);
    return room;
  })();

  fetchPromises.set(key, promise);
  try {
    return await promise;
  } finally {
    fetchPromises.delete(key);
  }
}

function ensureChannel(code: string): RealtimeChannel | null {
  const key = code.toUpperCase();
  if (channels.has(key)) return channels.get(key)!;

  const supabase = getMultiplayerSupabase();
  if (!supabase) return null;

  const channel = supabase
    .channel(`room:${key}`, { config: { broadcast: { self: true }, presence: { key: getDeviceId() } } })
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "mp_rooms", filter: `code=eq.${key}` },
      (payload) => {
        const row = payload.new as MpRoomRow | undefined;
        if (row?.code) {
          const room = rowToRoom(row);
          cacheSet(room);
        }
      }
    )
    .on("broadcast", { event: "game-event" }, ({ payload }) => {
      const p = payload as { room?: GameRoom; event?: string; data?: unknown };
      if (p.room) cacheSet(p.room);
      else if (p.event && p.data) {
        const room = cacheGet(key);
        if (room) {
          room.gameState = {
            ...(room.gameState ?? {}),
            [p.event]: p.data,
            _lastEvent: p.event,
            _updatedAt: new Date().toISOString(),
          };
          cacheSet(room);
        }
      }
    })
    .subscribe();

  channels.set(key, channel);
  return channel;
}

function broadcastEvent(code: string, event: string, data: unknown, room?: GameRoom): void {
  const channel = ensureChannel(code);
  if (!channel) return;
  void channel.httpSend("game-event", { event, data, room });
}

async function upsertPresence(
  room: GameRoom,
  deviceId: string,
  nickname: string,
  status: "online" | "lobby" | "playing" | "spectating" = "lobby"
): Promise<void> {
  const supabase = getMultiplayerSupabase();
  if (!supabase) return;
  await supabase.from("mp_presence").upsert({
    device_id: deviceId,
    nickname,
    status: room.status === "playing" ? "playing" : status,
    game_slug: room.gameSlug,
    room_code: room.code,
    since: new Date().toISOString(),
    spectatable: room.status === "playing",
    last_heartbeat: new Date().toISOString(),
  });
}

function applyAndPersist(code: string, mutator: (room: GameRoom) => GameRoom | null): GameRoom | null {
  const room = cacheGet(code);
  if (!room) return null;
  const next = mutator(room);
  if (!next) return null;
  cacheSet(next);
  void persistRoom(next);
  broadcastEvent(code, "room-update", next, next);
  return next;
}

export const supabaseTransport: MultiplayerTransport = {
  createRoom(params: CreateRoomParams): GameRoom {
    const deviceId = getDeviceId();
    const nickname = params.hostNickname ?? getLastNickname() ?? "Player";
    const code = (params.code ?? randomCode()).toUpperCase();
    if (params.code) {
      cacheRemove(code);
      void deleteRoom(code);
    }
    const room: GameRoom = {
      code,
      gameSlug: params.gameSlug,
      hostId: deviceId,
      maxPlayers: params.maxPlayers ?? 8,
      players: [{
        deviceId,
        nickname,
        ready: true,
        isGuest: params.isGuest,
        reconnectToken: deviceId.slice(0, 8),
      }],
      spectators: [],
      status: "waiting",
      countdown: 3,
      matchMode: params.matchMode ?? "private",
      createdAt: new Date().toISOString(),
    };
    cacheSet(room);
    ensureChannel(room.code);
    void persistRoom(room);
    void upsertPresence(room, deviceId, nickname);
    return room;
  },

  joinRoom(code: string, options?: JoinRoomOptions): GameRoom | null {
    const key = code.toUpperCase();
    let room = cacheGet(key);
    if (!room) {
      void fetchRoomFromSupabase(key).then((fetched) => {
        if (fetched) notify(key, fetched);
      });
      return null;
    }
    const deviceId = getDeviceId();
    if (room.players.some((p) => p.deviceId === deviceId)) {
      if (room.spectators.includes(deviceId)) {
        room = { ...room, spectators: room.spectators.filter((id) => id !== deviceId) };
        cacheSet(room);
        void persistRoom(room);
      }
      return room;
    }
    if (room.players.length >= room.maxPlayers) return null;
    const nickname = options?.nickname ?? getLastNickname() ?? "Guest";
    room = {
      ...room,
      players: [...room.players, { deviceId, nickname, ready: false, isGuest: options?.isGuest, reconnectToken: deviceId.slice(0, 8) }],
    };
    cacheSet(room);
    void persistRoom(room);
    void upsertPresence(room, deviceId, nickname);
    return room;
  },

  leaveRoom(code: string): void {
    const room = cacheGet(code);
    if (!room) return;
    const deviceId = getDeviceId();
    const nextPlayers = room.players.filter((p) => p.deviceId !== deviceId);
    const nextSpectators = room.spectators.filter((id) => id !== deviceId);
    if (nextPlayers.length === 0) {
      cacheRemove(code);
      void deleteRoom(code);
    } else {
      const next: GameRoom = {
        ...room,
        players: nextPlayers,
        spectators: nextSpectators,
        hostId: room.hostId === deviceId ? nextPlayers[0]!.deviceId : room.hostId,
      };
      cacheSet(next);
      void persistRoom(next);
    }
    const supabase = getMultiplayerSupabase();
    if (supabase) void supabase.from("mp_presence").delete().eq("device_id", deviceId);
  },

  getRoom(code: string): GameRoom | null {
    return cacheGet(code);
  },

  setPlayerReady(code: string, ready: boolean): GameRoom | null {
    return applyAndPersist(code, (room) => {
      const deviceId = getDeviceId();
      const players = room.players.map((p) => (p.deviceId === deviceId ? { ...p, ready } : p));
      let status = room.status;
      let countdown = room.countdown;
      if (players.every((p) => p.ready) && players.length >= 2) {
        status = "ready";
        countdown = 3;
      }
      return { ...room, players, status, countdown };
    });
  },

  send(code: string, event: string, payload: unknown): GameRoom | null {
    const room = cacheGet(code);
    if (!room) return null;
    // Ephemeral sim/presence: merge into cache + broadcast event only.
    // Full-room broadcast caused last-writer-wins wipe of peer:* keys across devices.
    const ephemeral =
      event === "state" ||
      event === "input" ||
      event.startsWith("peer:") ||
      event.startsWith("input:");
    const next: GameRoom = {
      ...room,
      gameState: {
        ...(room.gameState ?? {}),
        [event]: payload,
        _lastEvent: event,
        _updatedAt: new Date().toISOString(),
      },
    };
    cacheSet(next);
    if (ephemeral) {
      broadcastEvent(code, event, payload);
      return next;
    }
    void persistRoom(next);
    broadcastEvent(code, event, payload, next);
    return next;
  },

  sync(code: string): GameRoom | null {
    void fetchRoomFromSupabase(code);
    return cacheGet(code);
  },

  start(code: string): GameRoom | null {
    const room = applyAndPersist(code, (r) => ({
      ...r,
      status: "playing" as const,
      startedAt: new Date().toISOString(),
      countdown: 0,
    }));
    if (room) room.players.forEach((p) => void upsertPresence(room, p.deviceId, p.nickname, "playing"));
    return room;
  },

  finish(code: string, result: MatchResult): GameRoom | null {
    return applyAndPersist(code, (r) => ({
      ...r,
      status: "finished" as const,
      finishedAt: result.finishedAt,
      players: r.players.map((p) => ({ ...p, score: result.scores[p.deviceId] ?? p.score })),
    }));
  },

  joinAsSpectator(code: string): GameRoom | null {
    return applyAndPersist(code, (room) => {
      const deviceId = getDeviceId();
      if (room.spectators.includes(deviceId)) return room;
      return { ...room, spectators: [...room.spectators, deviceId] };
    });
  },

  reconnect(code: string, token: string): GameRoom | null {
    const room = cacheGet(code);
    if (room?.players.some((p) => p.reconnectToken === token)) return room;
    void fetchRoomFromSupabase(code);
    return supabaseTransport.joinRoom(code);
  },

  tickCountdown(code: string): GameRoom | null {
    return applyAndPersist(code, (room) => {
      if (room.status !== "ready" || room.countdown <= 0) return room;
      const countdown = room.countdown - 1;
      if (countdown === 0) {
        return { ...room, countdown: 0, status: "playing", startedAt: new Date().toISOString() };
      }
      return { ...room, countdown };
    });
  },

  subscribe(code: string, listener: (room: GameRoom) => void): () => void {
    ensureChannel(code);
    void fetchRoomFromSupabase(code);
    return subscribeCache(code, listener);
  },
};

/** Async join — use when cache is empty (cross-device). */
export async function joinRoomAsync(code: string, options?: JoinRoomOptions): Promise<GameRoom | null> {
  await fetchRoomFromSupabase(code);
  return supabaseTransport.joinRoom(code, options);
}

/** Preload room for lobby pages. */
export async function ensureRoomLoaded(code: string): Promise<GameRoom | null> {
  return fetchRoomFromSupabase(code);
}
