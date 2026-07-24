export interface MancalaState {
  /** 14 pits: 0-5 player, 6 player store, 7-12 cpu, 13 cpu store */
  pits: number[];
  current: 1 | 2;
  winner: 1 | 2 | "draw" | null;
  lastMove: number | null;
}

const PLAYER_STORE = 6;
const CPU_STORE = 13;
const PLAYER_START = 0;
const CPU_START = 7;

export function createInitialState(): MancalaState {
  const pits = Array(14).fill(0);
  for (let i = 0; i < 6; i++) {
    pits[i] = 4;
    pits[i + CPU_START] = 4;
  }
  return { pits, current: 1, winner: null, lastMove: null };
}

function opposite(pit: number): number {
  return 12 - pit;
}

function isPlayerPit(p: number): boolean {
  return p >= PLAYER_START && p <= 5;
}

function isCpuPit(p: number): boolean {
  return p >= CPU_START && p <= 12;
}

function sow(state: MancalaState, pit: number): MancalaState {
  const pits = [...state.pits];
  let seeds = pits[pit]!;
  pits[pit] = 0;
  let idx = pit;
  const player = state.current;
  while (seeds > 0) {
    idx = (idx + 1) % 14;
    if (player === 1 && idx === CPU_STORE) continue;
    if (player === 2 && idx === PLAYER_STORE) continue;
    pits[idx]!++;
    seeds--;
  }
  let extraTurn = false;
  if (player === 1 && idx === PLAYER_STORE) extraTurn = true;
  if (player === 2 && idx === CPU_STORE) extraTurn = true;

  const lastIdx = idx;
  if (
    player === 1 &&
    isPlayerPit(lastIdx) &&
    pits[lastIdx] === 1 &&
    pits[opposite(lastIdx)]! > 0
  ) {
    pits[PLAYER_STORE]! += pits[opposite(lastIdx)]! + 1;
    pits[opposite(lastIdx)] = 0;
    pits[lastIdx] = 0;
  }
  if (
    player === 2 &&
    isCpuPit(lastIdx) &&
    pits[lastIdx] === 1 &&
    pits[opposite(lastIdx)]! > 0
  ) {
    pits[CPU_STORE]! += pits[opposite(lastIdx)]! + 1;
    pits[opposite(lastIdx)] = 0;
    pits[lastIdx] = 0;
  }

  const playerEmpty = pits.slice(0, 6).every((n) => n === 0);
  const cpuEmpty = pits.slice(7, 13).every((n) => n === 0);
  if (playerEmpty || cpuEmpty) {
    for (let i = 0; i < 6; i++) {
      pits[PLAYER_STORE]! += pits[i]!;
      pits[i] = 0;
      pits[CPU_STORE]! += pits[i + CPU_START]!;
      pits[i + CPU_START] = 0;
    }
    const ps = pits[PLAYER_STORE]!;
    const cs = pits[CPU_STORE]!;
    const winner = ps > cs ? 1 : cs > ps ? 2 : "draw";
    return { pits, current: player, winner, lastMove: pit };
  }

  const next: 1 | 2 = extraTurn ? player : player === 1 ? 2 : 1;
  return { pits, current: next, winner: null, lastMove: pit };
}

export function playerMove(state: MancalaState, pit: number): MancalaState {
  if (state.winner !== null || state.current !== 1) return state;
  if (!isPlayerPit(pit) || state.pits[pit] === 0) return state;
  return sow(state, pit);
}

export function cpuMove(state: MancalaState): MancalaState {
  if (state.winner !== null || state.current !== 2) return state;
  const options = Array.from({ length: 6 }, (_, i) => i + CPU_START).filter(
    (p) => state.pits[p]! > 0
  );
  if (options.length === 0) return state;
  const pit = options[Math.floor(Math.random() * options.length)]!;
  return sow(state, pit);
}

export function computeScore(state: MancalaState): number {
  if (state.winner === 1) return state.pits[PLAYER_STORE]! * 10;
  if (state.winner === "draw") return state.pits[PLAYER_STORE]! * 5;
  return state.pits[PLAYER_STORE]! * 2;
}
