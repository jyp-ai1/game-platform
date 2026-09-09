/**
 * Join-stress safety — default OFF (Realtime/Egress protection).
 * Product multiplayer is unaffected; QA/e2e only.
 *
 * Enable: MULTIPLAYER_STRESS_TEST=1 RC4_STRESS_COUNT=5
 */
const ENABLED =
  process.env.MULTIPLAYER_STRESS_TEST === "1" ||
  process.env.MULTIPLAYER_STRESS_TEST === "true";

const HARD_CAP = Math.max(1, Number(process.env.MAX_STRESS_JOINS ?? "5"));

export function resolveStressJoinCount(rawEnvCount: string | undefined, label = "join-stress"): {
  enabled: boolean;
  count: number;
} {
  if (!ENABLED) {
    console.warn(
      `[stress-guard] ${label} DISABLED (set MULTIPLAYER_STRESS_TEST=1 to enable). count=0`
    );
    return { enabled: false, count: 0 };
  }
  const requested = Math.max(0, Number(rawEnvCount ?? "0") || 0);
  const count = Math.min(requested, HARD_CAP);
  if (requested > HARD_CAP) {
    console.warn(`[stress-guard] ${label} capped ${requested} → ${count}`);
  }
  return { enabled: true, count };
}

export function isMultiplayerStressEnabled(): boolean {
  return ENABLED;
}
