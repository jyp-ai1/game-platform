"use client";

import {
  clearSave,
  emitGameRetry,
  playGameFeel,
  PuzzlePlayField,
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
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { Bomb, Flag, RotateCcw } from "lucide-react";
import type { MouseEvent } from "react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  boardCols,
  checkWin,
  chordReveal,
  createEmptyBoard,
  placeMines,
  reveal,
  revealAllMines,
  toggleFlag,
  type Board,
  type Difficulty,
} from "./engine";
import {
  playGameOverAudio,
  playPopAudio,
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";
import { getMinesweeperBoard } from "./minesweeper-stage-config";

const PUZZLE_FIELD_CLASS = "touch-none max-w-[min(100%,20.5rem)]";

const GAME_SLUG = "minesweeper";
const MAX_SCORE = 10000;
const SCORE_PER_SECOND = 50;
const MIN_SCORE = 100;
const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
const STAGE_BY_DIFFICULTY: Record<Difficulty, number> = { EASY: 1, MEDIUM: 2, HARD: 3 };

type Status = "waiting" | "playing" | "won" | "lost";

interface State {
  board: Board;
  status: Status;
  startedAt: number | null;
  flagMode: boolean;
  difficulty: Difficulty;
}

type Action =
  | { type: "reveal"; row: number; col: number }
  | { type: "chord"; row: number; col: number }
  | { type: "toggleFlag"; row: number; col: number }
  | { type: "toggleFlagMode" }
  | { type: "restart"; difficulty?: Difficulty };

function createInitialState(difficulty: Difficulty = "MEDIUM"): State {
  const def = getMinesweeperBoard(difficulty);
  return {
    board: createEmptyBoard(def.rows, def.cols),
    status: "waiting",
    startedAt: null,
    flagMode: false,
    difficulty,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "restart":
      return createInitialState(action.difficulty ?? state.difficulty);
    case "toggleFlagMode":
      return { ...state, flagMode: !state.flagMode };
    case "toggleFlag": {
      if (state.status === "won" || state.status === "lost") {
        return state;
      }
      return { ...state, board: toggleFlag(state.board, action.row, action.col) };
    }
    case "chord": {
      if (state.status !== "playing") {
        return state;
      }
      const center = state.board[action.row]?.[action.col];
      if (!center?.revealed || center.adjacentMines === 0) {
        return state;
      }
      const { board, hitMine } = chordReveal(state.board, action.row, action.col);
      if (hitMine) {
        return { ...state, board, status: "lost" };
      }
      const won = checkWin(board);
      return { ...state, board, status: won ? "won" : "playing" };
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
        board = placeMines(
          board,
          action.row,
          action.col,
          getMinesweeperBoard(state.difficulty).mines
        );
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
  const stageIndex = STAGE_BY_DIFFICULTY[state.difficulty];
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    score:
      state.status === "won"
        ? Math.max(MIN_SCORE, MAX_SCORE - elapsed * SCORE_PER_SECOND)
        : 0,
    stageIndex,
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
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, elapsed, reportScore]);

  useEffect(() => {
    if (state.status === "waiting") {
      setElapsed(0);
    }
  }, [state.status]);

  useEffect(() => {
    if (state.status === "lost" && prevStatusRef.current !== "lost") {
      playGameOverAudio();
    }
    if (state.status === "won" && prevStatusRef.current !== "won") {
      playStageClearAudio();
    }
    if (state.status === "playing" && prevStatusRef.current === "waiting") {
      playPopAudio();
      playGameFeel("pop", fieldRef.current);
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  function handleClick(row: number, col: number) {
    if (!canPlayRef.current) {
      return;
    }
    primeGameAudio();
    const cell = state.board[row]?.[col];
    if (
      !state.flagMode &&
      cell?.revealed &&
      cell.adjacentMines > 0 &&
      state.status === "playing"
    ) {
      playPopAudio();
      playGameFeel("button", fieldRef.current);
      dispatch({ type: "chord", row, col });
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
    primeGameAudio();
    playGameFeel("flag", fieldRef.current);
    dispatch({ type: "toggleFlag", row, col });
  }

  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry(difficulty?: Difficulty) {
    emitGameRetry(GAME_SLUG);
    clearSave(GAME_SLUG);
    setElapsed(0);
    resetGameAudioPrime();
    dispatch({ type: "restart", difficulty });
  }

  function handleNewGame() {
    onNewGame();
    setElapsed(0);
    resetGameAudioPrime();
    dispatch({ type: "restart" });
  }

  const boardDef = getMinesweeperBoard(state.difficulty);
  const cols = boardCols(state.board);

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-3 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <ScoreBox label="Stage" value={stageIndex} />
          <ScoreBox label="Time" value={`${elapsed}s`} />
          <ScoreBox label="Best" value={feel.bestScore} />
        </div>
        <div className="flex flex-wrap gap-1">
          {DIFFICULTIES.map((level) => (
            <Button
              key={level}
              variant={state.difficulty === level ? "default" : "outline"}
              size="sm"
              className="min-h-9 px-2 text-xs"
              disabled={state.status === "playing" && state.startedAt !== null}
              onClick={() => handleRetry(level)}
            >
              {level === "EASY" ? "Easy" : level === "MEDIUM" ? "Normal" : "Hard"}
            </Button>
          ))}
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
            onClick={() => handleRetry()}
          >
            <RotateCcw />
          </Button>
        </div>
      </div>

      <PuzzlePlayField
        fieldRef={fieldRef}
        bursts={feel.bursts}
        className={cn(PUZZLE_FIELD_CLASS, state.status === "lost" && "ring-2 ring-destructive/60 rounded-xl")}
      >
        <div
          className="relative grid w-full gap-0.5 rounded-xl bg-muted p-1"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
        {state.board.map((rowCells, row) =>
          rowCells.map((cell, col) => (
            <button
              key={`${row}-${col}`}
              type="button"
              onClick={() => handleClick(row, col)}
              onContextMenu={(event) => handleContextMenu(event, row, col)}
              className={cn(
                "flex aspect-square min-h-8 min-w-8 items-center justify-center rounded-[3px] text-[10px] font-bold transition-transform duration-150 active:scale-95 sm:min-h-9 sm:min-w-9 sm:text-xs",
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
            onExit={handleExit}
            onRetry={() => handleRetry()}
            onRestart={() => handleRetry()}
          />
        ) : null}

        {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}
        </div>
      </PuzzlePlayField>

      {phase === "resume-prompt" ? (
        <ResumeDialog
          gameTitle="Minesweeper"
          onResume={onResume}
          onNewGame={handleNewGame}
        />
      ) : null}

      <p className="text-xs text-muted-foreground">
        {boardDef.label} · {boardDef.mines}개 지뢰 · 숫자 칸을 다시 클릭하면 chord(주변 깃발과 일치 시 열기)
      </p>
    </div>
  );
}
