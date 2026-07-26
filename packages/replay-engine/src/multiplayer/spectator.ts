/** Spectator helpers — join watch mode without playing. */
import { getDeviceId } from "@game-platform/game-sdk";
import { spectator, subscribeRoom, getRoom } from "@game-platform/multiplayer-sdk";

export function watchSpectator(code: string, onUpdate: (room: ReturnType<typeof getRoom>) => void): () => void {
  spectator(code);
  onUpdate(getRoom(code));
  return subscribeRoom(code, onUpdate);
}

export function leaveSpectator(code: string): void {
  const room = getRoom(code);
  if (!room) return;
  const deviceId = getDeviceId();
  if (room.spectators.includes(deviceId)) {
    // leave handled by transport leaveRoom if needed; spectator list updated on next sync
  }
}
