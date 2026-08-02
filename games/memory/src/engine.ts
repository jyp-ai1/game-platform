export const PAIR_SYMBOLS = [
  "🍎",
  "🍌",
  "🍇",
  "🍒",
  "🍉",
  "🍋",
  "🍓",
  "🥝",
  "🍑",
  "🥭",
  "🍍",
  "🫐",
  "🍈",
  "🍊",
  "🥥",
  "🍏",
  "🍐",
  "🍅",
];
export const BASE_SCORE = 1000;
export const PENALTY_PER_MOVE = 15;
export const MIN_SCORE = 100;
export const COMBO_BONUS = 25;
export const PERFECT_ROUND_BONUS = 350;

export interface Card {
  symbol: string;
  matched: boolean;
}

export function shuffle<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = temp;
  }
  return arr;
}

export function createShuffledCards(pairs: number): Card[] {
  const symbols = PAIR_SYMBOLS.slice(0, pairs);
  const deck = shuffle([...symbols, ...symbols]);
  return deck.map((symbol) => ({ symbol, matched: false }));
}

export function computeScore(moves: number, stageIndex = 1): number {
  const stageBonus = (stageIndex - 1) * 200;
  return Math.max(MIN_SCORE, BASE_SCORE + stageBonus - moves * PENALTY_PER_MOVE);
}

export function computeStageScore(
  moves: number,
  stageIndex: number,
  comboPeak: number,
  perfect: boolean
): number {
  const comboBonus = Math.max(0, comboPeak - 1) * COMBO_BONUS;
  const perfectBonus = perfect ? PERFECT_ROUND_BONUS : 0;
  return computeScore(moves, stageIndex) + comboBonus + perfectBonus;
}
