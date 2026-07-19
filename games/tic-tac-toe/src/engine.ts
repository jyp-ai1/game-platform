export type Player = "X" | "O";
export type CellValue = Player | null;

export interface TicTacToeState {
  board: CellValue[]; // length 9, index = row*3+col
  currentPlayer: Player;
  winner: Player | "draw" | null;
  winningLine: number[] | null; // the 3 winning indices, for a highlight animation; null if no winner yet
}

const WIN_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // cols
  [0, 4, 8],
  [2, 4, 6], // diagonals
];

function otherPlayer(player: Player): Player {
  return player === "X" ? "O" : "X";
}

function checkWinner(board: CellValue[]): {
  winner: Player | "draw" | null;
  line: number[] | null;
} {
  for (const line of WIN_LINES) {
    const [a, b, c] = line as [number, number, number];
    const va = board[a];
    if (va && va === board[b] && va === board[c]) {
      return { winner: va, line };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { winner: "draw", line: null };
  }
  return { winner: null, line: null };
}

export function createInitialState(): TicTacToeState {
  return {
    board: Array(9).fill(null),
    currentPlayer: "X",
    winner: null,
    winningLine: null,
  };
}

export function playMove(
  state: TicTacToeState,
  index: number
): TicTacToeState {
  if (state.board[index] !== null || state.winner !== null) {
    return state;
  }

  const board = state.board.slice();
  board[index] = state.currentPlayer;

  const { winner, line } = checkWinner(board);

  return {
    board,
    currentPlayer: winner === null ? otherPlayer(state.currentPlayer) : state.currentPlayer,
    winner,
    winningLine: line,
  };
}

// Minimax evaluation of a board from the perspective of whoever is "on
// move" isn't needed directly — instead we score terminal states from O's
// perspective (CPU) and search assuming both sides play optimally: O
// maximizes the score, X minimizes it.
function minimax(board: CellValue[], player: Player): number {
  const { winner } = checkWinner(board);
  if (winner === "O") return 1;
  if (winner === "X") return -1;
  if (winner === "draw") return 0;

  const scores: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null) continue;
    const next = board.slice();
    next[i] = player;
    scores.push(minimax(next, otherPlayer(player)));
  }

  return player === "O" ? Math.max(...scores) : Math.min(...scores);
}

export function cpuMove(state: TicTacToeState): TicTacToeState {
  if (state.winner !== null || state.currentPlayer !== "O") {
    return state;
  }

  const availableIndices: number[] = [];
  for (let i = 0; i < state.board.length; i++) {
    if (state.board[i] === null) {
      availableIndices.push(i);
    }
  }

  let bestScore = -Infinity;
  let bestIndices: number[] = [];

  for (const index of availableIndices) {
    const next = state.board.slice();
    next[index] = "O";
    const score = minimax(next, "X");
    if (score > bestScore) {
      bestScore = score;
      bestIndices = [index];
    } else if (score === bestScore) {
      bestIndices.push(index);
    }
  }

  const chosenIndex =
    bestIndices[Math.floor(Math.random() * bestIndices.length)]!;

  return playMove(state, chosenIndex);
}
