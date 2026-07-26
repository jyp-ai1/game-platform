/** Universal Power-Up Engine */
import type { ActivePowerUp, PowerUpKind } from "@game-platform/shared";

const DURATION_MS: Record<PowerUpKind, number> = {
  speed: 8000,
  shield: 6000,
  magnet: 10_000,
  double_score: 12_000,
  ghost: 5000,
  freeze: 4000,
  teleport: 0,
};

export function grantPowerUp(kind: PowerUpKind, now = Date.now()): ActivePowerUp {
  return { kind, expiresAt: now + DURATION_MS[kind] };
}

export function isPowerUpActive(p: ActivePowerUp | undefined, now = Date.now()): boolean {
  return !!p && (p.kind === "teleport" || now < p.expiresAt);
}

export function rollTreasurePowerUp(): PowerUpKind {
  const kinds: PowerUpKind[] = ["speed", "shield", "magnet", "double_score", "ghost", "freeze"];
  return kinds[Math.floor(Math.random() * kinds.length)]!;
}

export const PowerUpEngine = {
  grant: grantPowerUp,
  active: isPowerUpActive,
  roll: rollTreasurePowerUp,
  duration: DURATION_MS,
};
