/** Heatmap — death/congestion/food-gap aggregation. */
import type { HeatmapCell, MatchAnalyticsSnapshot } from "@game-platform/shared";

import { getMatchAnalyticsHistory } from "./analytics";

export function buildHeatmap(gameSlug?: string, gridSize = 20): HeatmapCell[] {
  const history = getMatchAnalyticsHistory().filter((s) => !gameSlug || s.gameSlug === gameSlug);
  const cells = new Map<string, HeatmapCell>();

  for (const snap of history) {
    for (const d of snap.deaths) {
      const gx = Math.floor((d.x / gridSize) * gridSize);
      const gy = Math.floor((d.y / gridSize) * gridSize);
      const key = `${gx},${gy}`;
      const cell = cells.get(key) ?? { x: gx, y: gy, deaths: 0, congestion: 0, foodGap: 0 };
      cell.deaths += 1;
      cells.set(key, cell);
    }
    if (snap.foodShortageTicks > 0) {
      const key = "0,0";
      const cell = cells.get(key) ?? { x: 0, y: 0, deaths: 0, congestion: 0, foodGap: 0 };
      cell.foodGap += snap.foodShortageTicks;
      cells.set(key, cell);
    }
    for (const [, kills] of Object.entries(snap.killDistribution)) {
      const key = "center";
      const cell = cells.get(key) ?? { x: gridSize / 2, y: gridSize / 2, deaths: 0, congestion: kills, foodGap: 0 };
      cell.congestion += kills;
      cells.set(key, cell);
    }
  }

  return [...cells.values()].sort((a, b) => b.deaths - a.deaths);
}

export function summarizeHeatmap(cells: HeatmapCell[]): {
  deathHotspots: HeatmapCell[];
  emptyZones: HeatmapCell[];
  foodGaps: number;
} {
  const deathHotspots = cells.filter((c) => c.deaths >= 3).slice(0, 10);
  const emptyZones = cells.filter((c) => c.deaths === 0 && c.congestion === 0).slice(0, 5);
  const foodGaps = cells.reduce((sum, c) => sum + c.foodGap, 0);
  return { deathHotspots, emptyZones, foodGaps };
}

export function heatmapFromSnapshot(snap: MatchAnalyticsSnapshot, bucketSize: number): HeatmapCell[] {
  const cells = new Map<string, HeatmapCell>();
  for (const d of snap.deaths) {
    const gx = Math.floor(d.x / bucketSize) * bucketSize;
    const gy = Math.floor(d.y / bucketSize) * bucketSize;
    const key = `${gx},${gy}`;
    const cell = cells.get(key) ?? { x: gx, y: gy, deaths: 0, congestion: 0, foodGap: 0 };
    cell.deaths += 1;
    cells.set(key, cell);
  }
  return [...cells.values()];
}
