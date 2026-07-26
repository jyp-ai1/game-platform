/**
 * Heartbeat — presence + latency measurement for cross-device sync.
 */
import { getDeviceId, getLastNickname } from "@game-platform/game-sdk";

import { getMultiplayerSupabase } from "@game-platform/multiplayer-sdk";

let intervalId: ReturnType<typeof setInterval> | null = null;
let latencyMs = 0;

export function getLatencyMs(): number {
  return latencyMs;
}

export function startHeartbeat(roomCode?: string, gameSlug?: string): void {
  stopHeartbeat();
  const tick = async () => {
    const supabase = getMultiplayerSupabase?.();
    if (!supabase) return;
    const start = Date.now();
    await supabase.from("mp_presence").upsert({
      device_id: getDeviceId(),
      nickname: getLastNickname() || "Player",
      status: roomCode ? "playing" : "online",
      game_slug: gameSlug ?? null,
      room_code: roomCode ?? null,
      last_heartbeat: new Date().toISOString(),
      latency_ms: latencyMs,
    });
    latencyMs = Date.now() - start;
  };
  void tick();
  intervalId = setInterval(tick, 15_000);
}

export function stopHeartbeat(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
