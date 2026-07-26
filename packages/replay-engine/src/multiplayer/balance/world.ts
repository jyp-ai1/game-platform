/** World Generator — features scale with player count tiers. */
import type { ComputedBalance, WorldFeature } from "@game-platform/shared";

export function generateWorldFeatures(balance: ComputedBalance): WorldFeature[] {
  const features: WorldFeature[] = [];
  const w = balance.worldSize;
  const mid = Math.floor(w / 2);
  const n = balance.playerCount;

  // 2-3P: central competition zone
  if (n >= 2 && n <= 3) {
    features.push({ type: "boss_zone", x: mid - 4, y: mid - 4, w: 8, h: 8, label: "Hot Zone" });
  }

  // 4-8P: rivers, walls, portals, boss food zone
  if (n >= 4) {
    features.push({ type: "river", x: mid, y: 0, w: 2, h: w });
    features.push({ type: "boss_zone", x: mid - 3, y: mid - 3, w: 6, h: 6, label: "Boss Food" });
  }
  if (n >= 4 && n <= 8) {
    features.push({ type: "wall", x: Math.floor(w * 0.2), y: Math.floor(w * 0.45), w: Math.floor(w * 0.6), h: 2 });
    features.push({ type: "portal", x: 4, y: mid, label: "A" });
    features.push({ type: "portal", x: w - 5, y: mid, label: "B" });
  }

  // 9-20P: biomes (forest, desert, ice, space)
  if (n >= 9) {
    features.push({ type: "biome", x: 0, y: 0, w: Math.floor(w / 2), h: Math.floor(w / 2), label: "forest" });
    features.push({ type: "biome", x: Math.floor(w / 2), y: 0, w: Math.floor(w / 2), h: Math.floor(w / 2), label: "desert" });
    features.push({ type: "biome", x: 0, y: Math.floor(w / 2), w: Math.floor(w / 2), h: Math.floor(w / 2), label: "ice" });
    features.push({ type: "biome", x: Math.floor(w / 2), y: Math.floor(w / 2), w: Math.floor(w / 2), h: Math.floor(w / 2), label: "space" });
    features.push({ type: "wall", x: Math.floor(w * 0.25), y: Math.floor(w * 0.25), w: Math.floor(w * 0.5), h: 2 });
    features.push({ type: "portal", x: 5, y: mid, label: "A" });
    features.push({ type: "portal", x: w - 6, y: mid, label: "B" });
  }

  if (balance.bossEventsEnabled || n >= 9) {
    features.push({ type: "boss_zone", x: mid - 6, y: mid - 6, w: 12, h: 12, label: "Boss Arena" });
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
