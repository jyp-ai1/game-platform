/** Spectator 2.0 — friend, top1, free, replay, slowmo */
import type { SpectatorMode } from "@game-platform/shared";

export interface SpectatorState {
  mode: SpectatorMode;
  targetDeviceId: string | null;
  slowMo: boolean;
  freeCam: { x: number; y: number };
}

export function createSpectatorState(
  mode: SpectatorMode = "top1",
  targetDeviceId: string | null = null
): SpectatorState {
  return { mode, targetDeviceId, slowMo: mode === "slowmo", freeCam: { x: 0, y: 0 } };
}

export function resolveSpectatorTarget(
  mode: SpectatorMode,
  rankings: { deviceId: string }[],
  friendId?: string,
  preferId?: string | null
): string | null {
  if (mode === "friend" && friendId) return friendId;
  if (mode === "top1") return rankings[0]?.deviceId ?? preferId ?? null;
  if (mode === "replay" || mode === "slowmo") return preferId ?? rankings[0]?.deviceId ?? null;
  return preferId ?? null;
}

export const SpectatorEngine = {
  create: createSpectatorState,
  resolve: resolveSpectatorTarget,
};
