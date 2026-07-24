export type Tile = [number, number];

export interface DominoState {
  playerHand: Tile[];
  cpuHand: Tile[];
  boneyard: Tile[];
  chain: Tile[];
  leftEnd: number | null;
  rightEnd: number | null;
  current: "player" | "cpu";
  winner: "player" | "cpu" | null;
  message: string;
}

function makeDeck(): Tile[] {
  const deck: Tile[] = [];
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) deck.push([a, b]);
  }
  return deck;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function createInitialState(): DominoState {
  const deck = shuffle(makeDeck());
  const playerHand = deck.slice(0, 7);
  const cpuHand = deck.slice(7, 14);
  const boneyard = deck.slice(14);
  return {
    playerHand,
    cpuHand,
    boneyard,
    chain: [],
    leftEnd: null,
    rightEnd: null,
    current: "player",
    winner: null,
    message: "Play a tile on the chain ends",
  };
}

function canPlay(tile: Tile, left: number | null, right: number | null): boolean {
  if (left === null) return true;
  const [a, b] = tile;
  return a === left || b === left || a === right || b === right;
}

function orientTile(tile: Tile, end: number, side: "left" | "right"): Tile {
  const [a, b] = tile;
  if (side === "left") {
    if (b === end) return tile;
    if (a === end) return [b, a];
  } else {
    if (a === end) return tile;
    if (b === end) return [a, b];
  }
  return tile;
}

function playTile(
  state: DominoState,
  handKey: "playerHand" | "cpuHand",
  index: number
): DominoState {
  const hand = [...state[handKey]];
  const tile = hand[index];
  if (!tile || !canPlay(tile, state.leftEnd, state.rightEnd)) return state;

  hand.splice(index, 1);
  let chain = [...state.chain];
  let leftEnd = state.leftEnd;
  let rightEnd = state.rightEnd;

  if (leftEnd === null) {
    chain = [tile];
    leftEnd = tile[0];
    rightEnd = tile[1];
  } else if (tile[0] === rightEnd || tile[1] === rightEnd) {
    const oriented = orientTile(tile, rightEnd, "right");
    chain.push(oriented);
    rightEnd = oriented[1];
  } else if (tile[0] === leftEnd || tile[1] === leftEnd) {
    const oriented = orientTile(tile, leftEnd, "left");
    chain.unshift(oriented);
    leftEnd = oriented[0];
  } else {
    return state;
  }

  const winner =
    hand.length === 0 ? (handKey === "playerHand" ? "player" : "cpu") : null;

  return {
    ...state,
    [handKey]: hand,
    chain,
    leftEnd,
    rightEnd,
    current: winner ? state.current : state.current === "player" ? "cpu" : "player",
    winner,
    message: winner ? `${winner === "player" ? "You" : "CPU"} win!` : "Your turn",
  };
}

export function playerPlay(state: DominoState, index: number): DominoState {
  if (state.winner || state.current !== "player") return state;
  return playTile(state, "playerHand", index);
}

function validMoves(hand: Tile[], left: number | null, right: number | null): number[] {
  return hand
    .map((t, i) => (canPlay(t, left, right) ? i : -1))
    .filter((i) => i >= 0);
}

export function playerDraw(state: DominoState): DominoState {
  if (state.winner || state.current !== "player" || state.boneyard.length === 0)
    return state;
  const boneyard = [...state.boneyard];
  const drawn = boneyard.pop()!;
  const playerHand = [...state.playerHand, drawn];
  const moves = validMoves(playerHand, state.leftEnd, state.rightEnd);
  if (moves.length === 0 && boneyard.length === 0) {
    return { ...state, playerHand, boneyard, current: "cpu", message: "CPU turn" };
  }
  return { ...state, playerHand, boneyard, message: moves.length ? "Play or draw again" : "Drew a tile" };
}

export function cpuMove(state: DominoState): DominoState {
  if (state.winner || state.current !== "cpu") return state;
  let s = state;
  let hand = [...s.cpuHand];
  let boneyard = [...s.boneyard];
  let moves = validMoves(hand, s.leftEnd, s.rightEnd);
  while (moves.length === 0 && boneyard.length > 0) {
    hand.push(boneyard.pop()!);
    moves = validMoves(hand, s.leftEnd, s.rightEnd);
  }
  s = { ...s, cpuHand: hand, boneyard };
  if (moves.length === 0) {
    return { ...s, current: "player", message: "CPU passed — your turn" };
  }
  const idx = moves[Math.floor(Math.random() * moves.length)]!;
  return playTile(s, "cpuHand", idx);
}

export function computeScore(state: DominoState): number {
  if (state.winner === "player") return 100 + (7 - state.playerHand.length) * 10;
  return 0;
}

export function playerCanAct(state: DominoState): boolean {
  return (
    state.current === "player" &&
    state.winner === null &&
    (validMoves(state.playerHand, state.leftEnd, state.rightEnd).length > 0 ||
      state.boneyard.length > 0)
  );
}

export function getPlayableIndices(state: DominoState): number[] {
  return validMoves(state.playerHand, state.leftEnd, state.rightEnd);
}
