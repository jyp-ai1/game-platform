/** State sync helpers — latency buffer + merge. */

export function applyLatencyBuffer(timestamp: number, latencyMs: number): number {
  return timestamp + Math.floor(latencyMs / 2);
}

export function mergeGameState<T extends Record<string, unknown>>(
  local: T,
  remote: T,
  remoteUpdatedAt: string,
  localUpdatedAt?: string
): T {
  if (!localUpdatedAt) return remote;
  return new Date(remoteUpdatedAt) >= new Date(localUpdatedAt) ? remote : local;
}
