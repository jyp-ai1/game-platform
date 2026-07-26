/** World Generator — features scale with player count. */
import type { ComputedBalance, WorldFeature } from "@game-platform/shared";

export function generateWorldFeatures(balance: ComputedBalance): WorldFeature[] {
  const features: WorldFeature[] = [];
  const w = balance.worldSize;
  const mid = Math.floor(w / 2);

  if (balance.playerCount >= 4) {
    features.push({ type: "river", x: mid, y: 0, w: 2, h: w });
  }
  if (balance.playerCount >= 8) {
    features.push({ type: "wall", x: Math.floor(w * 0.25), y: Math.floor(w * 0.25), w: Math.floor(w * 0.5), h: 2 });
    features.push({ type: "portal", x: 5, y: mid, label: "A" });
    features.push({ type: "portal", x: w - 6, y: mid, label: "B" });
  }
  if (balance.playerCount >= 16) {
    features.push({ type: "biome", x: 0, y: 0, w: Math.floor(w / 2), h: Math.floor(w / 2), label: "forest" });
    features.push({ type: "biome", x: Math.floor(w / 2), y: Math.floor(w / 2), w: Math.floor(w / 2), h: Math.floor(w / 2), label: "desert" });
  }
  if (balance.bossEventsEnabled) {
    features.push({ type: "boss_zone", x: mid - 5, y: mid - 5, w: 10, h: 10, label: "Boss Arena" });
  }

  return features;
}

export function isBlockedByFeature(features: WorldFeature[], x: number, y: number): boolean {
  for (const f of features) {
    if (f.type === "wall" || f.type === "river") {
      const fw = f.w ?? 1;
      const fh = f.h ?? 1;
      if (x >= f.x && x < f.x + fw && y >= f.y && y < f.y + fh) return true;
    }
  }
  return false;
}
