import { getDeviceId, getLastNickname } from "@game-platform/game-sdk";
import type { PresenceEntry, PresenceStatus } from "@game-platform/shared";

import { getMultiplayerSupabase } from "../transport/supabase-client";

const presenceCache: PresenceEntry[] = [];

/** Read cached presence (call fetchPresenceEntries to refresh). */
export function getPresenceEntries(): PresenceEntry[] {
  return presenceCache.filter((e) => e.deviceId !== getDeviceId());
}

/** Fetch presence from Supabase (cross-device). */
export async function fetchPresenceEntries(): Promise<PresenceEntry[]> {
  const supabase = getMultiplayerSupabase();
  if (!supabase) return getPresenceEntries();
  const { data } = await supabase
    .from("mp_presence")
    .select("*")
    .gt("last_heartbeat", new Date(Date.now() - 90_000).toISOString());
  if (!data) return getPresenceEntries();
  presenceCache.length = 0;
  for (const row of data) {
    presenceCache.push({
      deviceId: row.device_id,
      nickname: row.nickname,
      status: row.status as PresenceStatus,
      gameSlug: row.game_slug ?? undefined,
      roomCode: row.room_code ?? undefined,
      since: row.since,
      spectatable: row.spectatable,
    });
  }
  return getPresenceEntries();
}

/** Update own presence. */
export async function setMyPresence(
  status: PresenceStatus,
  gameSlug?: string,
  roomCode?: string
): Promise<void> {
  const supabase = getMultiplayerSupabase();
  if (!supabase) return;
  await supabase.from("mp_presence").upsert({
    device_id: getDeviceId(),
    nickname: getLastNickname() || "Player",
    status,
    game_slug: gameSlug ?? null,
    room_code: roomCode ?? null,
    since: new Date().toISOString(),
    spectatable: status === "playing",
    last_heartbeat: new Date().toISOString(),
  });
}

/** Format presence for UI: "민수 · Snake Playing · 2분" */
export function formatPresenceLabel(entry: PresenceEntry): string {
  const game = entry.gameSlug ? entry.gameSlug.replace(/-/g, " ") : "";
  if (entry.status === "playing" && game) return `${entry.nickname} · ${game} Playing`;
  if (entry.status === "lobby") return `${entry.nickname} · Lobby`;
  if (entry.status === "spectating") return `${entry.nickname} · Spectating`;
  return `${entry.nickname} · Online`;
}

export function presenceMinutesAgo(entry: PresenceEntry): number {
  const ms = Date.now() - new Date(entry.since).getTime();
  return Math.max(0, Math.floor(ms / 60_000));
}
