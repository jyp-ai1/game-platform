/** Universal Party System — persistent party above rooms, survives game transitions. */
import { getDeviceId, getLastNickname } from "@game-platform/game-sdk";
import { createRoom, defaultMaxPlayers, getMultiplayerSupabase, joinRoomAsync } from "@game-platform/multiplayer-sdk";
import type { MaxPlayers, Party, PartyChatMessage, PartyHistoryEntry, PartyMember, PartyProgress, PartyReactionId } from "@game-platform/shared";

import { REACTION_TEXT } from "./constants";
import { advancePartyMissions, ensurePartyMissions } from "./party-mission";

const LOCAL_PREFIX = "play29:party:";
const listeners = new Map<string, Set<(p: Party) => void>>();

function partyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function now(): string {
  return new Date().toISOString();
}

function me(): PartyMember {
  const deviceId = getDeviceId();
  return {
    deviceId,
    nickname: getLastNickname() || "Player",
    ready: false,
    isLeader: false,
    joinedAt: now(),
  };
}

function defaultProgress(): PartyProgress {
  return { xp: 0, level: 1, streak: 0, collection: [], partyCoin: 0 };
}

function rowToParty(row: Record<string, unknown>): Party {
  return {
    id: row.id as string,
    leaderId: row.leader_id as string,
    members: (row.members as PartyMember[]) ?? [],
    chat: (row.chat as PartyChatMessage[]) ?? [],
    currentGameSlug: (row.current_game_slug as string) ?? undefined,
    currentRoomCode: (row.current_room_code as string) ?? undefined,
    queue: (row.queue as Party["queue"]) ?? [],
    history: (row.history as PartyHistoryEntry[]) ?? [],
    progress: (row.progress as PartyProgress) ?? defaultProgress(),
    missions: (row.missions as Party["missions"]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function partyToRow(party: Party): Record<string, unknown> {
  return {
    id: party.id,
    leader_id: party.leaderId,
    members: party.members,
    chat: party.chat,
    current_game_slug: party.currentGameSlug ?? null,
    current_room_code: party.currentRoomCode ?? null,
    queue: party.queue,
    history: party.history,
    progress: party.progress,
    missions: party.missions,
    created_at: party.createdAt,
    updated_at: party.updatedAt,
  };
}

function loadLocal(code: string): Party | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LOCAL_PREFIX + code);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Party;
  } catch {
    return null;
  }
}

function saveLocal(party: Party): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_PREFIX + party.id, JSON.stringify(party));
  window.localStorage.setItem(LOCAL_PREFIX + "active", party.id);
}

export function getActivePartyId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LOCAL_PREFIX + "active");
}

async function saveParty(party: Party): Promise<Party> {
  party.updatedAt = now();
  saveLocal(party);
  const supabase = getMultiplayerSupabase();
  if (supabase) {
    await supabase.from("mp_parties").upsert(partyToRow(party));
  }
  listeners.get(party.id)?.forEach((cb) => cb(party));
  return party;
}

async function loadParty(code: string): Promise<Party | null> {
  const supabase = getMultiplayerSupabase();
  if (supabase) {
    const { data } = await supabase.from("mp_parties").select("*").eq("id", code.toUpperCase()).maybeSingle();
    if (data) {
      const party = rowToParty(data);
      saveLocal(party);
      return party;
    }
  }
  return loadLocal(code.toUpperCase());
}

function notify(code: string, party: Party): void {
  listeners.get(code)?.forEach((cb) => cb(party));
}

/** Create a new party — leader is local device. */
export async function createParty(nickname?: string): Promise<Party> {
  const member = me();
  if (nickname) member.nickname = nickname;
  member.isLeader = true;
  member.ready = true;
  const ts = now();
  const party: Party = {
    id: partyCode(),
    leaderId: member.deviceId,
    members: [member],
    chat: [],
    queue: [],
    history: [],
    progress: defaultProgress(),
    missions: [],
    createdAt: ts,
    updatedAt: ts,
  };
  ensurePartyMissions(party);
  return saveParty(party);
}

/** Join an existing party by code. */
export async function joinParty(code: string, nickname?: string): Promise<Party | null> {
  const existing = await loadParty(code.toUpperCase());
  if (!existing) return null;
  const deviceId = getDeviceId();
  const found = existing.members.find((m) => m.deviceId === deviceId);
  if (found) {
    if (nickname) found.nickname = nickname;
    return saveParty(existing);
  }
  const member = me();
  if (nickname) member.nickname = nickname;
  existing.members.push(member);
  return saveParty(existing);
}

/** Leave party — transfers leadership if needed. */
export async function leaveParty(code: string): Promise<void> {
  const party = await loadParty(code.toUpperCase());
  if (!party) return;
  const deviceId = getDeviceId();
  party.members = party.members.filter((m) => m.deviceId !== deviceId);
  if (party.members.length === 0) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LOCAL_PREFIX + code.toUpperCase());
      if (getActivePartyId() === code.toUpperCase()) {
        window.localStorage.removeItem(LOCAL_PREFIX + "active");
      }
    }
    return;
  }
  if (party.leaderId === deviceId) {
    party.leaderId = party.members[0]!.deviceId;
    party.members.forEach((m) => { m.isLeader = m.deviceId === party.leaderId; });
  }
  await saveParty(party);
}

/** Get party by code. */
export async function getParty(code: string): Promise<Party | null> {
  return loadParty(code.toUpperCase());
}

/** Get active party for local device. */
export async function getMyParty(): Promise<Party | null> {
  const id = getActivePartyId();
  if (!id) return null;
  return loadParty(id);
}

/** Toggle ready state. */
export async function setPartyReady(code: string, ready: boolean): Promise<Party | null> {
  const party = await loadParty(code.toUpperCase());
  if (!party) return null;
  const deviceId = getDeviceId();
  const member = party.members.find((m) => m.deviceId === deviceId);
  if (!member) return null;
  member.ready = ready;
  return saveParty(party);
}

/** Send chat message or emoji reaction. */
export async function sendPartyChat(code: string, text: string, emoji?: string): Promise<Party | null> {
  const party = await loadParty(code.toUpperCase());
  if (!party) return null;
  const member = party.members.find((m) => m.deviceId === getDeviceId());
  if (!member) return null;
  const msg: PartyChatMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    deviceId: member.deviceId,
    nickname: member.nickname,
    text,
    emoji,
    at: now(),
  };
  party.chat = [...party.chat.slice(-49), msg];
  return saveParty(party);
}

/** Transfer leadership. */
export async function setPartyLeader(code: string, deviceId: string): Promise<Party | null> {
  const party = await loadParty(code.toUpperCase());
  if (!party || party.leaderId !== getDeviceId()) return null;
  if (!party.members.some((m) => m.deviceId === deviceId)) return null;
  party.leaderId = deviceId;
  party.members.forEach((m) => { m.isLeader = m.deviceId === deviceId; });
  return saveParty(party);
}

/** Queue next game — leader only. */
export async function queuePartyGame(code: string, gameSlug: string): Promise<Party | null> {
  const party = await loadParty(code.toUpperCase());
  if (!party || party.leaderId !== getDeviceId()) return null;
  party.queue = [...party.queue, { gameSlug, queuedAt: now() }];
  return saveParty(party);
}

/** Travel to game — creates room, links party, all members join room. */
export async function travelToGame(code: string, gameSlug: string): Promise<{ party: Party; roomCode: string } | null> {
  const party = await loadParty(code.toUpperCase());
  if (!party) return null;
  if (party.leaderId !== getDeviceId()) return null;

  const maxPlayers: MaxPlayers = defaultMaxPlayers(gameSlug);
  const room = createRoom(gameSlug, maxPlayers, "friends");
  party.currentGameSlug = gameSlug;
  party.currentRoomCode = room.code;

  for (const m of party.members) {
    if (m.deviceId !== getDeviceId()) continue;
    await joinRoomAsync(room.code, { nickname: m.nickname, isGuest: false });
    m.ready = false;
  }
  const saved = await saveParty(party);
  return { party: saved, roomCode: room.code };
}

/** Send quick reaction — 1-tap game chat. */
export async function sendPartyReaction(code: string, reaction: PartyReactionId): Promise<Party | null> {
  return sendPartyChat(code, REACTION_TEXT[reaction], REACTION_TEXT[reaction]);
}

/** Record completed game — party persists, XP/streak/collection update. */
export async function finishPartyGame(
  code: string,
  playerCount: number,
  meta?: { winnerId?: string; scores?: Record<string, number>; gameSlug?: string; totalScore?: number; won?: boolean }
): Promise<Party | null> {
  const party = await loadParty(code.toUpperCase());
  if (!party) return null;
  const gameSlug = party.currentGameSlug ?? meta?.gameSlug;
  const roomCode = party.currentRoomCode ?? "unknown";
  if (!gameSlug) return party;

  party.history = [
    ...party.history.slice(-19),
    {
      gameSlug,
      roomCode,
      finishedAt: now(),
      playerCount,
      winnerId: meta?.winnerId,
      scores: meta?.scores,
    },
  ];

  const xpGain = 20 + playerCount * 5 + (meta?.won ? 15 : 0);
  party.progress.xp += xpGain;
  party.progress.level = Math.floor(party.progress.xp / 100) + 1;
  party.progress.partyCoin += 5 + playerCount;

  const today = new Date().toISOString().slice(0, 10);
  const lastDay = party.progress.lastPlayedAt?.slice(0, 10);
  if (lastDay === today) {
    // same day — keep streak
  } else if (lastDay && new Date(today).getTime() - new Date(lastDay).getTime() <= 86_400_000 * 2) {
    party.progress.streak += 1;
  } else {
    party.progress.streak = 1;
  }
  party.progress.lastPlayedAt = now();

  const gameCounts: Record<string, number> = {};
  for (const h of party.history) gameCounts[h.gameSlug] = (gameCounts[h.gameSlug] ?? 0) + 1;
  party.progress.favoriteGame = Object.entries(gameCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  const badge = `${gameSlug}-veteran`;
  if (!party.progress.collection.includes(badge) && party.history.filter((h) => h.gameSlug === gameSlug).length >= 3) {
    party.progress.collection.push(badge);
  }

  ensurePartyMissions(party);
  advancePartyMissions(party, {
    gameSlug,
    totalScore: meta?.totalScore ?? 0,
    won: meta?.won ?? false,
  });

  party.currentGameSlug = undefined;
  party.currentRoomCode = undefined;
  party.members.forEach((m) => { m.ready = false; });
  if (party.queue.length > 0) party.queue = party.queue.slice(1);
  return saveParty(party);
}

/** Subscribe to party updates — Supabase Realtime + local notify. */
export function subscribeParty(code: string, cb: (party: Party) => void): () => void {
  const upper = code.toUpperCase();
  if (!listeners.has(upper)) listeners.set(upper, new Set());
  listeners.get(upper)!.add(cb);

  const supabase = getMultiplayerSupabase();
  let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;
  if (supabase) {
    channel = supabase
      .channel(`party:${upper}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "mp_parties", filter: `id=eq.${upper}` }, (payload) => {
        if (payload.new) {
          const party = rowToParty(payload.new as Record<string, unknown>);
          saveLocal(party);
          notify(upper, party);
        }
      })
      .subscribe();
  }

  void loadParty(upper).then((p) => { if (p) cb(p); });

  return () => {
    listeners.get(upper)?.delete(cb);
    if (channel) void supabase?.removeChannel(channel);
  };
}

export const PartyEngine = {
  create: createParty,
  join: joinParty,
  leave: leaveParty,
  get: getParty,
  mine: getMyParty,
  ready: setPartyReady,
  chat: sendPartyChat,
  react: sendPartyReaction,
  leader: setPartyLeader,
  queue: queuePartyGame,
  travel: travelToGame,
  finish: finishPartyGame,
  subscribe: subscribeParty,
  activeId: getActivePartyId,
};
