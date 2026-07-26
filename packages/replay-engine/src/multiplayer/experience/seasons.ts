/** Seasonal World — auto theme by calendar */
import type { SeasonTheme } from "@game-platform/shared";

export function getCurrentSeason(now = new Date()): SeasonTheme {
  const m = now.getMonth() + 1;
  const d = now.getDate();
  if (m === 10) return "halloween";
  if (m === 12) return "christmas";
  if (m === 1 || (m === 2 && d <= 15)) return "lunar_new_year";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 3 && m <= 5) return "spring";
  if (now.getHours() >= 20 || now.getHours() < 6) return "night";
  return "spring";
}

export const SEASON_PALETTE: Record<SeasonTheme, { bg: string; accent: string; label: string }> = {
  spring: { bg: "#14532d", accent: "#86efac", label: "Spring" },
  summer: { bg: "#0c4a6e", accent: "#7dd3fc", label: "Summer" },
  halloween: { bg: "#431407", accent: "#fb923c", label: "Halloween" },
  christmas: { bg: "#1e3a5f", accent: "#fca5a5", label: "Christmas" },
  lunar_new_year: { bg: "#7f1d1d", accent: "#fde047", label: "Lunar New Year" },
  rain: { bg: "#1e293b", accent: "#94a3b8", label: "Rain" },
  night: { bg: "#0f172a", accent: "#818cf8", label: "Night" },
  volcano: { bg: "#450a0a", accent: "#f97316", label: "Volcano" },
};

export function seasonModifiers(theme: SeasonTheme): { foodBonus: number; eventRate: number } {
  const mods: Record<SeasonTheme, { foodBonus: number; eventRate: number }> = {
    spring: { foodBonus: 1.1, eventRate: 1 },
    summer: { foodBonus: 1, eventRate: 1.2 },
    halloween: { foodBonus: 1, eventRate: 1.5 },
    christmas: { foodBonus: 1.2, eventRate: 1.1 },
    lunar_new_year: { foodBonus: 1.3, eventRate: 1.2 },
    rain: { foodBonus: 0.9, eventRate: 0.9 },
    night: { foodBonus: 1, eventRate: 1.3 },
    volcano: { foodBonus: 0.85, eventRate: 1.6 },
  };
  return mods[theme];
}
