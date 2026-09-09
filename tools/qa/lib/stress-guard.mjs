/**
 * Multipayer / join stress-test safety guard.
 *
 * Default OFF — prevents accidental Realtime/Egress explosions from QA runners.
 * Real product multiplayer is unaffected (this module is only imported by QA/e2e).
 *
 * Enable explicitly:
 *   MULTIPLAYER_STRESS_TEST=1 RC4_STRESS_COUNT=5 npm run qa:rc4-production
 */
const ENABLED =
  process.env.MULTIPLAYER_STRESS_TEST === "1" ||
  process.env.MULTIPLAYER_STRESS_TEST === "true";

const HARD_CAP = Math.max(1, Number(process.env.MAX_STRESS_JOINS ?? "5"));

/**
 * @param {string | undefined} rawEnvCount
 * @param {{ label?: string }} [opts]
 * @returns {{ enabled: boolean, count: number }}
 */
export function resolveStressJoinCount(rawEnvCount, opts = {}) {
  const label = opts.label ?? "join-stress";
  if (!ENABLED) {
    console.warn(
      `[stress-guard] ${label} DISABLED (set MULTIPLAYER_STRESS_TEST=1 to enable). Running 0 iterations.`
    );
    return { enabled: false, count: 0 };
  }
  const requested = Math.max(0, Number(rawEnvCount ?? "0") || 0);
  const count = Math.min(requested, HARD_CAP);
  if (requested > HARD_CAP) {
    console.warn(
      `[stress-guard] ${label} capped ${requested} → ${count} (MAX_STRESS_JOINS=${HARD_CAP})`
    );
  }
  if (count === 0) {
    console.warn(`[stress-guard] ${label} enabled but count=0 — no joins.`);
  }
  return { enabled: true, count };
}

export function isMultiplayerStressEnabled() {
  return ENABLED;
}
