"use client";

import {
  clearSave,
  emitGameRetry,
  ResumeDialog,
  SaveIndicator,
  useAutoSave,
  useGameSDK,
  useReadyCountdown,
  useResumableGame,
} from "@game-platform/game-sdk";
import { Button, cn, GameOverOverlay, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { Eraser, RotateCcw } from "lucide-react";
import { useEffect, useReducer } from "react";

import {
  createInitialState,
  enterValue,
  selectCell,
  type Difficulty,
  type SudokuState,
} from "./engine";

const GAME_SLUG = "sudoku";
const BASE_SCORE = 1000;
const PENALTY_PER_MISTAKE = 200;
const MIN_SCORE = 100;
const SIZE = 9;
const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

type Action =
  | { type: "select"; row: number; col: number }
  | { type: "enter"; value: number | null }
  | { type: "restart"; difficulty?: Difficulty };

function reducer(state: SudokuState, action: Action): SudokuState {
  switch (action.type) {
    case "restart":
      return createInitialState(action.difficulty);
    case "select":
      return selectCell(state, action.row, action.col);
    case "enter":
      return enterValue(state, action.value);
    default:
      return state;
  }
}

function computeScore(mistakes: number): number {
  return Math.max(MIN_SCORE, BASE_SCORE - mistakes * PENALTY_PER_MISTAKE);
}

export function SudokuGame() {
  const { phase, initialState, onResume, onNewGame } = useResumableGame(
    GAME_SLUG,
    createInitialState
  );
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const { canPlay, showCountdown, completeCountdown } = useReadyCountdown(phase);

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "playing" ? state : null),
    [state]
  );

  useEffect(() => {
    if (state.status === "won") {
      reportScore(GAME_SLUG, computeScore(state.mistakes));
    }
    if (state.status !== "playing") {
      clearSave(GAME_SLUG);
    }
  }, [state.status, reportScore, state.mistakes]);

  const interactive = canPlay && state.status === "playing";

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Mistakes" value={state.mistakes} />
        <div className="flex items-center gap-1">
          {DIFFICULTIES.map((difficulty) => (
            <Button
              key={difficulty}
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: "restart", difficulty })}
            >
              {difficulty}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={() => dispatch({ type: "restart" })}
        >
          <RotateCcw />
        </Button>
      </div>

      <div
        className="relative grid aspect-square w-full max-w-sm gap-px rounded-xl bg-muted p-1"
        style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}
      >
        {state.board.map((rowCells, row) =>
          rowCells.map((value, col) => {
            const isGiven = state.puzzle[row]![col] !== null;
            const isSelected =
              state.selectedCell?.row === row && state.selectedCell?.col === col;
            const isWrong =
              value !== null && !isGiven && value !== state.solution[row]![col];
            const rightBorder = col === 2 || col === 5;
            const bottomBorder = row === 2 || row === 5;
            return (
              <button
                key={`${row}-${col}`}
                type="button"
                disabled={!interactive}
                onClick={() => dispatch({ type: "select", row, col })}
                className={cn(
                  "flex aspect-square items-center justify-center text-sm font-semibold sm:text-base",
                  isGiven ? "bg-muted-foreground/20" : "bg-background hover:bg-muted-foreground/10",
                  isSelected && "bg-primary/30",
                  isWrong ? "text-destructive" : "text-foreground",
                  rightBorder && "mr-0.5",
                  bottomBorder && "mb-0.5"
                )}
              >
                {value ?? ""}
              </button>
            );
          })
        )}

        {state.status !== "playing" ? (
          <GameOverOverlay
            message={state.status === "won" ? "You Win!" : "Game Over"}
            score={state.status === "won" ? computeScore(state.mistakes) : undefined}
            gameSlug={GAME_SLUG}
            onRetry={() => emitGameRetry(GAME_SLUG)}
            onRestart={() => dispatch({ type: "restart" })}
          />
        ) : null}
        {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      </div>

      <div className="grid w-full max-w-sm grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <Button
            key={digit}
            variant="outline"
            disabled={!interactive}
            onClick={() => dispatch({ type: "enter", value: digit })}
          >
            {digit}
          </Button>
        ))}
        <Button
          variant="outline"
          size="icon"
          aria-label="지우기"
          disabled={!interactive}
          onClick={() => dispatch({ type: "enter", value: null })}
        >
          <Eraser />
        </Button>
      </div>

      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Sudoku" onResume={onResume} onNewGame={onNewGame} />
      ) : null}

      <p className="text-xs text-muted-foreground">
        빈 칸을 선택하고 숫자를 입력해 스도쿠를 완성하세요.
      </p>
    </div>
  );
}
