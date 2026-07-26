/** Playtest heatmap — death / crowd / event density from telemetry */
import type { HeatmapCell } from "@game-platform/shared";

import { getSnakeTelemetryHistory } from "./snake-telemetry";

export interface PlaytestHeatmapSummary {
  deathHotspots: HeatmapCell[];
  crowdHotspots: HeatmapCell[];
  eventZones: HeatmapCell[];
  foodGapTicks: number;
  sessionCount: number;
}

function bucketKey(x: number, y: number, size: number): string {
  const gx = Math.floor(x / size) * size;
  const gy = Math.floor(y / size) * size;
  return `${gx},${gy}`;
}

function cell(map: Map<string, HeatmapCell>, x: number, y: number, size: number): HeatmapCell {
  const gx = Math.floor(x / size) * size;
  const gy = Math.floor(y / size) * size;
  const key = bucketKey(x, y, size);
  return map.get(key) ?? { x: gx, y: gy, deaths: 0, congestion: 0, foodGap: 0 };
}

/** Build heatmap from stored playtest/telemetry sessions */
export function buildPlaytestHeatmap(gridSize = 20): PlaytestHeatmapSummary {
  const history = getSnakeTelemetryHistory();
  const map = new Map<string, HeatmapCell>();

  for (const s of history) {
    for (const d of s.deaths) {
      const c = cell(map, d.x, d.y, gridSize);
      c.deaths += 1;
      map.set(bucketKey(d.x, d.y, gridSize), c);
    }
    for (const p of s.crowdSamples ?? []) {
      const c = cell(map, p.x, p.y, gridSize);
      c.congestion += 1;
      map.set(bucketKey(p.x, p.y, gridSize), c);
    }
    for (const e of s.eventSamples ?? []) {
      const c = cell(map, e.x, e.y, gridSize);
      c.foodGap += 1;
      map.set(bucketKey(e.x, e.y, gridSize), c);
    }
  }

  const cells = [...map.values()].sort((a, b) => b.deaths + b.congestion - (a.deaths + a.congestion));
  return {
    deathHotspots: cells.filter((c) => c.deaths >= 2).slice(0, 12),
    crowdHotspots: cells.filter((c) => c.congestion >= 5).slice(0, 12),
    eventZones: cells.filter((c) => c.foodGap >= 3).slice(0, 8),
    foodGapTicks: history.reduce((a, s) => a + (s.foodShortageTicks ?? 0), 0),
    sessionCount: history.length,
  };
}

export const PlaytestHeatmap = { build: buildPlaytestHeatmap };
