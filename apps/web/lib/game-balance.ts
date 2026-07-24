import type { Difficulty } from "@game-platform/shared";

export type GameBalanceMeta = {
  playTimeLabel: string;
  recommendedScore: number;
  clearTimeSec: number;
  sessionType: "quick" | "long";
};

const BY_DIFFICULTY: Record<Difficulty, GameBalanceMeta> = {
  EASY: {
    playTimeLabel: "2–5 min",
    recommendedScore: 500,
    clearTimeSec: 180,
    sessionType: "quick",
  },
  MEDIUM: {
    playTimeLabel: "5–15 min",
    recommendedScore: 1000,
    clearTimeSec: 600,
    sessionType: "long",
  },
  HARD: {
    playTimeLabel: "15–30 min",
    recommendedScore: 2000,
    clearTimeSec: 1200,
    sessionType: "long",
  },
};

/** Per-slug balance tweaks (defaults derive from difficulty). */
const OVERRIDES: Partial<Record<string, Partial<GameBalanceMeta>>> = {
  tetris: { playTimeLabel: "10–20 min", recommendedScore: 5000, clearTimeSec: 900 },
  chess: { playTimeLabel: "15–45 min", recommendedScore: 1, clearTimeSec: 1800 },
  chess960: { playTimeLabel: "15–45 min", recommendedScore: 1, clearTimeSec: 1800 },
  sudoku: { playTimeLabel: "10–25 min", recommendedScore: 100, clearTimeSec: 900 },
  crossword: { playTimeLabel: "20–40 min", recommendedScore: 100, clearTimeSec: 1500 },
  kakuro: { playTimeLabel: "15–30 min", recommendedScore: 100, clearTimeSec: 1200 },
  nonogram: { playTimeLabel: "10–20 min", recommendedScore: 100, clearTimeSec: 900 },
  jigsaw: { playTimeLabel: "15–30 min", recommendedScore: 100, clearTimeSec: 1200 },
  "word-search": { playTimeLabel: "5–15 min", recommendedScore: 200, clearTimeSec: 600 },
  snake: { playTimeLabel: "3–8 min", recommendedScore: 800, clearTimeSec: 300 },
  "2048": { playTimeLabel: "5–12 min", recommendedScore: 2048, clearTimeSec: 480 },
  "whack-a-mole": { playTimeLabel: "1–3 min", recommendedScore: 300, clearTimeSec: 120, sessionType: "quick" },
  simon: { playTimeLabel: "2–5 min", recommendedScore: 400, clearTimeSec: 180, sessionType: "quick" },
  "tic-tac-toe": { playTimeLabel: "1–3 min", recommendedScore: 1, clearTimeSec: 120, sessionType: "quick" },
};

export function getGameBalanceMeta(slug: string, difficulty: Difficulty): GameBalanceMeta {
  const base = BY_DIFFICULTY[difficulty];
  const override = OVERRIDES[slug];
  return override ? { ...base, ...override } : base;
}

export function formatClearTime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m} min`;
}
