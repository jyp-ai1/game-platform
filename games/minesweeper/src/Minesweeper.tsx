"use client";

import {
  clearSave,
  emitGameRetry,
  GameFeelLayer,
  playGameFeel,
  ResumeDialog,
  SaveIndicator,
  StandardGameOverOverlay,
  useAutoSave,
  useGameSDK,
  useReadyCountdown,
  useResumableGame,
  standardFeelFromState,
  useStandardGameFeel,
} from "@game-platform/game-sdk";
import { Button, cn, ReadyCountdown } from "@game-platform/ui";
import { Bomb, Flag, RotateCcw } from "lucide-react";
import type { MouseEvent } from "react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  checkWin,
  createEmptyBoard,
  placeMines,
  reveal,
  revealAllMines,
  toggleFlag,
  type Board,
} from "./engine";

const GAME_SLUG = "minesweeper";
const MAX_SCORE = 10000;
const SCORE_PER_SECOND = 50;
const MIN_SCORE = 100;

type Status = "waiting" | "playing" | "won" | "lost";

interface State {
  board: Board;
  status: Status;
  startedAt: number | null;
  flagMode: boolean;
}

type Action =
  | { type: "reveal"; row: number; col: number }
  | { type: "toggleFlag"; row: number; col: number }
  | { type: "toggleFlagMode" }
  | { type: "restart" };

function createInitialState(): State {
  return {
    board: createEmptyBoard(),
    status: "waiting",
    startedAt: null,
    flagMode: false,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "toggleFlagMode":
      return { ...state, flagMode: !state.flagMode };
    case "toggleFlag": {
      if (state.status === "won" || state.status === "lost") {
        return state;
      }
      return { ...state, board: toggleFlag(state.board, action.row, action.col) };
    }
    case "reveal": {
      if (state.status === "won" || state.status === "lost") {
        return state;
      }
      const cell = state.board[action.row]?.[action.col];
      if (!cell || cell.revealed || cell.flagged) {
        return state;
      }

      let board = state.board;
      let startedAt = state.startedAt;
      if (state.status === "waiting") {
        board = placeMines(board, action.row, action.col);
        startedAt = Date.now();
      }

      const clicked = board[action.row]![action.col]!;
      if (clicked.mine) {
        return { ...state, board: revealAllMines(board), status: "lost", startedAt };
      }

      board = reveal(board, action.row, action.col);
      const won = checkWin(board);
      return { ...state, board, status: won ? "won" : "playing", startedAt };
    }
    default:
      return state;
  }
}

const NUMBER_COLORS: Record<number, string> = {
  1: "text-blue-500",
  2: "text-emerald-600",
  3: "text-red-500",
  4: "text-indigo-600",
  5: "text-amber-700",
  6: "text-cyan-600",
  7: "text-foreground",
  8: "text-muted-foreground",
};

export function MinesweeperGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const [elapsed, setElapsed] = useState(0);
  const fieldRef = useRef<HTMLDivElement>(null);
  const prevStatusRef = useRef(state.status);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    score:
      state.status === "won"
        ? Math.max(MIN_SCORE, MAX_SCORE - elapsed * SCORE_PER_SECOND)
        : 0,
    fieldRef,
  });

  // "waiting" (before the first click places mines) is indistinguishable
  // from "no save" — skip saving until there's actually progress worth
  // resuming, so the Resume Dialog never shows for a board equivalent to a
  // brand-new game.
  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "waiting" || state.status !== "playing" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status !== "playing" || state.startedAt === null) {
      return;
    }
    const startedAt = state.startedAt;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [state.status, state.startedAt]);

  useEffect(() => {
    if (state.status === "won") {
      const score = Math.max(MIN_SCORE, MAX_SCORE - elapsed * SCORE_PER_SECOND);
      reportScore(GAME_SLUG, score);
    }
    if (state.status === "won" || state.status === "lost") {
      clearSave(GAME_SLUG);
    }
  }, [state.status, elapsed, reportScore]);

  useEffect(() => {
    if (state.status === "waiting") {
      setElapsed(0);
    }
  }, [state.status]);

  useEffect(() => {
    if (state.status === "lost" && prevStatusRef.current !== "lost") {
      playGameFeel("explosion", fieldRef.current);
    }
    if (state.status === "won" && prevStatusRef.current !== "won") {
      playGameFeel("correct", fieldRef.current);
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  function handleClick(row: number, col: number) {
    if (!canPlayRef.current) {
      return;
    }
    if (state.flagMode) {
      playGameFeel("flag", fieldRef.current);
    } else {
      playGameFeel("button", fieldRef.current);
    }
    dispatch(
      state.flagMode
        ? { type: "toggleFlag", row, col }
        : { type: "reveal", row, col }
    );
  }

  function handleContextMenu(event: MouseEvent, row: number, col: number) {
    event.preventDefault();
    if (!canPlayRef.current) {
      return;
    }
    playGameFeel("flag", fieldRef.current);
    dispatch({ type: "toggleFlag", row, col });
  }

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    clearSave(GAME_SLUG);
    setElapsed(0);
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    setElapsed(0);
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="rounded-lg bg-muted px-3 py-1.5 text-center">
          <div className="text-[10px] font-medium uppercase text-muted-foreground">
            Time
          </div>
          <div className="text-lg font-bold tabular-nums">{elapsed}s</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={state.flagMode ? "default" : "outline"}
            size="icon"
            aria-label="깃발 모드"
            aria-pressed={state.flagMode}
            onClick={() => dispatch({ type: "toggleFlagMode" })}
          >
            <Flag />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="새 게임"
            onClick={handleRetry}
          >
            <RotateCcw />
          </Button>
        </div>
      </div>

      <div
        ref={fieldRef}
        className={cn(
          "relative grid w-full max-w-sm grid-cols-9 gap-0.5 rounded-xl bg-muted p-1",
          state.status === "lost" && "ring-2 ring-destructive/60"
        )}
      >
        {state.board.map((rowCells, row) =>
          rowCells.map((cell, col) => (
            <button
              key={`${row}-${col}`}
              type="button"
              onClick={() => handleClick(row, col)}
              onContextMenu={(event) => handleContextMenu(event, row, col)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-[3px] text-[10px] font-bold sm:text-xs",
                cell.revealed
                  ? cell.mine
                    ? "bg-destructive/20"
                    : "bg-background"
                  : "bg-muted-foreground/20 hover:bg-muted-foreground/30"
              )}
            >
              {cell.flagged && !cell.revealed ? (
                <Flag className="size-3 text-primary" />
              ) : cell.revealed && cell.mine ? (
                <Bomb className="size-3 text-destructive" />
              ) : cell.revealed && cell.adjacentMines > 0 ? (
                <span className={NUMBER_COLORS[cell.adjacentMines]}>
                  {cell.adjacentMines}
                </span>
              ) : null}
            </button>
          ))
        )}

        {state.status === "won" || state.status === "lost" ? (
          <StandardGameOverOverlay
            message={state.status === "won" ? "You Win!" : "Game Over"}
            score={state.status === "won" ? Math.max(MIN_SCORE, MAX_SCORE - elapsed * SCORE_PER_SECOND) : undefined}
            gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={feel.handleExit}
            onRetry={handleRetry}
            onRestart={handleRetry}
          />
        ) : null}

        {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}
        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}
      </div>

      {phase === "resume-prompt" ? (
        <ResumeDialog
          gameTitle="Minesweeper"
          onResume={onResume}
          onNewGame={handleNewGame}
        />
      ) : null}

      <p className="text-xs text-muted-foreground">
        칸을 클릭해 열고, 우클릭(모바일은 깃발 모드)으로 지뢰를 표시하세요.
      </p>
    </div>
  );
}
