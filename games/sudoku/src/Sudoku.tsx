"use client";

import {
  clearSave,
  emitGameRetry,
  feelWithScore,
  PuzzlePlayField,
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
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { Eraser, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  createInitialState,
  applyHint,
  enterValue,
  selectCell,
  type Difficulty,
  type SudokuState,
} from "./engine";
import {
  playGameOverAudio,
  playScoreAudio,
  playStageClearAudio,
  playWrongAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "sudoku";
const BASE_SCORE = 1000;
const PENALTY_PER_MISTAKE = 200;
const MIN_SCORE = 100;
const SIZE = 9;
const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
const STAGE_BY_DIFFICULTY: Record<Difficulty, number> = { EASY: 1, MEDIUM: 2, HARD: 3 };
const PUZZLE_FIELD_CLASS = "touch-none max-w-[min(100%,20.5rem)]";

type Action =
  | { type: "select"; row: number; col: number }
  | { type: "enter"; value: number | null }
  | { type: "hint" }
  | { type: "restart"; difficulty?: Difficulty };

function reducer(state: SudokuState, action: Action): SudokuState {
  switch (action.type) {
    case "restart":
      return createInitialState(action.difficulty);
    case "select":
      return selectCell(state, action.row, action.col);
    case "hint":
      return applyHint(state);
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
  const stageIndex = STAGE_BY_DIFFICULTY[state.difficulty];
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...feelWithScore(state as unknown as Record<string, unknown>, computeScore(state.mistakes)),
    stageIndex,
  });
  const { canPlay, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

  const prevMistakesRef = useRef(0);
  const prevBoardRef = useRef<string>("");
  const prevStatusRef = useRef(state.status);

  useEffect(() => {
    const boardKey = state.board.map((r) => r.join(",")).join("|");
    if (prevBoardRef.current && boardKey !== prevBoardRef.current && state.status === "playing") {
      const changed = state.selectedCell;
      if (changed) {
        const { row, col } = changed;
        const val = state.board[row]?.[col];
        if (val !== null && val === state.solution[row]?.[col]) {
          playScoreAudio();
          playGameFeel("correct");
        }
      }
    }
    prevBoardRef.current = boardKey;
  }, [state.board, state.selectedCell, state.solution, state.status]);

  useEffect(() => {
    if (state.mistakes > prevMistakesRef.current && state.status === "playing") {
      playWrongAudio();
      playGameFeel("wrong");
    }
    prevMistakesRef.current = state.mistakes;
  }, [state.mistakes, state.status]);

  useEffect(() => {
    if (state.status === "won") {
      playStageClearAudio();
    } else if (state.status === "over" && prevStatusRef.current !== "over") {
      playGameOverAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

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
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, reportScore, state.mistakes]);

  const interactive = canPlay && state.status === "playing";

  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry(difficulty?: (typeof DIFFICULTIES)[number]) {
    emitGameRetry(GAME_SLUG);
    clearSave(GAME_SLUG);
    resetGameAudioPrime();
    dispatch(
      difficulty ? { type: "restart", difficulty } : { type: "restart" }
    );
  }

  function handleNewGame() {
    onNewGame();
    dispatch({ type: "restart" });
  }

  const mistakesLeft = Math.max(0, state.maxMistakes - state.mistakes);

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-3 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <ScoreBox label="Score" value={computeScore(state.mistakes)} />
          <ScoreBox label="Mistakes" value={`${state.mistakes}/${state.maxMistakes}`} />
          <ScoreBox label="Left" value={mistakesLeft} />
          <ScoreBox label="Best" value={feel.bestScore} />
          <ScoreBox label="Level" value={state.difficulty} />
        </div>
        <div className="flex items-center gap-1">
          {DIFFICULTIES.map((difficulty) => (
            <Button
              key={difficulty}
              variant="outline"
              size="sm"
              disabled={state.status === "playing"}
              onClick={() => handleRetry(difficulty)}
            >
              {difficulty === "EASY" ? "Easy" : difficulty === "MEDIUM" ? "Normal" : "Hard"}
            </Button>
          ))}
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

      <div className="flex items-center gap-1.5" aria-label={`실수 ${state.mistakes}회, 남은 기회 ${mistakesLeft}회`}>
        {Array.from({ length: state.maxMistakes }, (_, index) => (
          <div
            key={index}
            className={cn(
              "size-3 rounded-full transition-colors",
              index < mistakesLeft ? "bg-primary" : "bg-destructive/40"
            )}
          />
        ))}
        <span className="text-xs text-muted-foreground">
          {mistakesLeft} mistake{mistakesLeft === 1 ? "" : "s"} left
        </span>
      </div>

      <PuzzlePlayField bursts={feel.bursts} className={PUZZLE_FIELD_CLASS}>
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
                onClick={() => {
                  primeGameAudio();
                  playGameFeel("button");
                  dispatch({ type: "select", row, col });
                }}
                className={cn(
                  "flex aspect-square min-h-11 min-w-11 items-center justify-center text-sm font-semibold transition-transform duration-150 active:scale-95 sm:text-base",
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
          <StandardGameOverOverlay
            message={state.status === "won" ? "You Win!" : "Game Over"}
            score={state.status === "won" ? computeScore(state.mistakes) : undefined}
            gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={handleExit}
            onRetry={handleRetry}
            onRestart={handleRetry}
          />
        ) : null}
        {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}
      </div>
      </PuzzlePlayField>

      <div className="grid w-full max-w-sm grid-cols-5 gap-2">
        <Button
          variant="secondary"
          className="col-span-5 min-h-11 py-3 transition-transform duration-150 active:scale-95"
          disabled={!interactive}
          onClick={() => {
            playGameFeel("button");
            dispatch({ type: "hint" });
          }}
        >
          Hint
        </Button>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <Button
            key={digit}
            variant="outline"
            className="min-h-11 py-3 transition-transform duration-150 active:scale-95"
            disabled={!interactive}
            onClick={() => {
              primeGameAudio();
              playGameFeel("button");
              dispatch({ type: "enter", value: digit });
            }}
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
        <ResumeDialog gameTitle="Sudoku" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}

      <p className="text-xs text-muted-foreground">
        빈 칸을 선택하고 숫자를 입력해 스도쿠를 완성하세요.
      </p>
    </div>
  );
}
