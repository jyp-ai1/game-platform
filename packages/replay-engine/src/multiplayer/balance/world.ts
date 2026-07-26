/** World Generator — biomes, zones, weather-aware features. */
import type { ComputedBalance, WorldFeature } from "@game-platform/shared";

function addBiomes(features: WorldFeature[], w: number, labels: string[]): void {
  const n = labels.length;
  if (n === 1) {
    features.push({ type: "biome", x: 0, y: 0, w, h: w, label: labels[0] });
    return;
  }
  const cols = Math.ceil(Math.sqrt(n));
  const cellW = Math.floor(w / cols);
  const cellH = Math.floor(w / cols);
  labels.forEach((label, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    features.push({ type: "biome", x: col * cellW, y: row * cellH, w: cellW, h: cellH, label });
  });
}

function addZones(features: WorldFeature[], w: number, env: ComputedBalance["environment"]): void {
  const mid = Math.floor(w / 2);
  if (env.zones.includes("safe")) {
    features.push({ type: "safe_zone", x: 2, y: 2, w: 8, h: 8, label: "Safe Zone" });
    features.push({ type: "safe_zone", x: w - 10, y: w - 10, w: 8, h: 8, label: "Safe Zone" });
  }
  if (env.zones.includes("danger")) {
    features.push({ type: "danger_zone", x: mid - 5, y: mid - 5, w: 10, h: 10, label: "Danger Zone" });
  }
  if (env.zones.includes("boss")) {
    features.push({ type: "boss_zone", x: mid - 8, y: mid - 8, w: 16, h: 16, label: env.activeBoss ?? "Boss Arena" });
  }
  if (env.zones.includes("treasure")) {
    features.push({ type: "treasure_zone", x: Math.floor(w * 0.2), y: Math.floor(w * 0.2), w: 6, h: 6, label: "Treasure" });
  }
  if (env.zones.includes("portal")) {
    features.push({ type: "portal_zone", x: 4, y: mid, label: "Portal A" });
    features.push({ type: "portal_zone", x: w - 5, y: mid, label: "Portal B" });
    features.push({ type: "portal", x: 4, y: mid, label: "A" });
    features.push({ type: "portal", x: w - 6, y: mid, label: "B" });
  }
  if (env.zones.includes("fog")) {
    features.push({ type: "fog_zone", x: 0, y: 0, w: Math.floor(w / 3), h: w, label: "Fog" });
  }
}

export function generateWorldFeatures(balance: ComputedBalance): WorldFeature[] {
  const features: WorldFeature[] = [];
  const w = balance.worldSize;
  const mid = Math.floor(w / 2);
  const env = balance.environment;

  addBiomes(features, w, env.biomes);
  addZones(features, w, env);

  if (balance.playerCount >= 4) {
    features.push({ type: "river", x: mid, y: 0, w: 2, h: w });
  }
  if (balance.playerCount >= 8) {
    features.push({ type: "wall", x: Math.floor(w * 0.2), y: Math.floor(w * 0.45), w: Math.floor(w * 0.6), h: 2 });
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
