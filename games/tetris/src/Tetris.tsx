"use client";

import {
  clearSave,
  emitGameRetry,
  getGroupDifficulty,
  ResumeDialog,
  SaveIndicator,
  StandardGameOverOverlay,
  useAutoSave,
  useGameSDK,
  useReadyCountdown,
  useResumableGame,
  standardFeelFromState,
  useStandardGameFeel,
  GameFeelLayer,
  playGameFeel,
} from "@game-platform/game-sdk";
import { Button, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import type { TouchEvent } from "react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  activeCells,
  COLS,
  createInitialState,
  gravityIntervalMs,
  hardDropRow,
  lockPiece,
  ROWS,
  SOFT_DROP_POINTS,
  TETROMINO_COLORS,
  tryMove,
  tryRotate,
  type TetrisState,
} from "./engine";
import { playGameOverAudio, primeGameAudio, resetGameAudioPrime } from "./game-audio-prime";

const GAME_SLUG = "tetris";
const SWIPE_THRESHOLD = 24;
const TAP_THRESHOLD = 12;

type Action =
  | { type: "move"; dCol: number }
  | { type: "rotate" }
  | { type: "softDrop" }
  | { type: "hardDrop" }
  | { type: "tick" }
  | { type: "restart" };

function reducer(state: TetrisState, action: Action): TetrisState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "move": {
      if (state.status !== "playing") {
        return state;
      }
      const moved = tryMove(state.board, state.active, action.dCol, 0);
      return moved ? { ...state, active: moved } : state;
    }
    case "rotate": {
      if (state.status !== "playing") {
        return state;
      }
      const rotated = tryRotate(state.board, state.active);
      return rotated ? { ...state, active: rotated } : state;
    }
    case "tick": {
      if (state.status !== "playing") {
        return state;
      }
      const moved = tryMove(state.board, state.active, 0, 1);
      return moved ? { ...state, active: moved } : lockPiece(state);
    }
    case "softDrop": {
      if (state.status !== "playing") {
        return state;
      }
      const moved = tryMove(state.board, state.active, 0, 1);
      return moved
        ? { ...state, active: moved, score: state.score + SOFT_DROP_POINTS }
        : lockPiece(state);
    }
    case "hardDrop": {
      if (state.status !== "playing") {
        return state;
      }
      const row = hardDropRow(state.board, state.active);
      return lockPiece({ ...state, active: { ...state.active, row } });
    }
    default:
      return state;
  }
}

export function TetrisGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    fieldRef,
  });
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const prevLinesRef = useRef(0);
  const prevStatusRef = useRef(state.status);

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "over" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status !== "playing" || !canPlay) {
      return;
    }
    const diff = getGroupDifficulty(GAME_SLUG, state.level);
    const id = setInterval(
      () => dispatch({ type: "tick" }),
      gravityIntervalMs(state.level) / diff.speedMult
    );
    return () => clearInterval(id);
  }, [state.status, state.level, canPlay]);

  useEffect(() => {
    if (state.status === "over" && prevStatusRef.current !== "over") {
      playGameOverAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, state.score, reportScore]);

  useEffect(() => {
    if (state.linesCleared > prevLinesRef.current) {
      playGameFeel("line-clear", fieldRef.current);
    }
    prevLinesRef.current = state.linesCleared;
  }, [state.linesCleared]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!canPlayRef.current) {
        return;
      }
      primeGameAudio();
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          playGameFeel("button", fieldRef.current);
          dispatch({ type: "move", dCol: -1 });
          break;
        case "ArrowRight":
          event.preventDefault();
          playGameFeel("button", fieldRef.current);
          dispatch({ type: "move", dCol: 1 });
          break;
        case "ArrowDown":
          event.preventDefault();
          playGameFeel("button", fieldRef.current);
          dispatch({ type: "softDrop" });
          break;
        case "ArrowUp":
          event.preventDefault();
          playGameFeel("button", fieldRef.current);
          dispatch({ type: "rotate" });
          break;
        case " ":
          event.preventDefault();
          playGameFeel("button", fieldRef.current);
          dispatch({ type: "hardDrop" });
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canPlayRef]);

  function handleTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!canPlayRef.current) {
      return;
    }
    const touch = event.changedTouches[0];
    if (!start || !touch) {
      return;
    }
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const maxAbs = Math.max(Math.abs(dx), Math.abs(dy));

    if (maxAbs < TAP_THRESHOLD) {
      return;
    }
    playGameFeel("button", fieldRef.current);
    if (maxAbs < SWIPE_THRESHOLD) {
      dispatch({ type: "rotate" });
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      dispatch({ type: "move", dCol: dx > 0 ? 1 : -1 });
    } else if (dy > 0) {
      dispatch({ type: "softDrop" });
    } else {
      dispatch({ type: "rotate" });
    }
  }

  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    prevLinesRef.current = 0;
    resetGameAudioPrime();
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    prevLinesRef.current = 0;
    resetGameAudioPrime();
    dispatch({ type: "restart" });
  }

  const activeCellSet = new Set(
    activeCells(state.active).map(({ row, col }) => `${row},${col}`)
  );
  const activeColor = TETROMINO_COLORS[state.active.type];

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="Score" value={state.score} />
          <ScoreBox label="Lines" value={state.linesCleared} />
          <ScoreBox label="Level" value={state.level} />
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={handleRetry}
        >
          <RotateCcw />
        </Button>
      </div>

      <div
        ref={fieldRef}
        className="relative grid aspect-[1/2] w-full max-w-xs touch-none select-none gap-px rounded-xl bg-muted p-1 transition-transform duration-150"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {state.board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isActiveCell = activeCellSet.has(`${rowIndex},${colIndex}`);
            const color = cell ?? (isActiveCell ? activeColor : undefined);
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="rounded-[2px] bg-muted-foreground/10"
                style={{
                  backgroundColor: color,
                  opacity: color ? 1 : undefined,
                }}
              />
            );
          })
        )}

        {state.status === "over" ? (
          <StandardGameOverOverlay
            message="Game Over"
            score={state.score}
            gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={handleExit}
            onRetry={handleRetry}
            onRestart={handleRetry}
          />
        ) : null}

        {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}

        {phase === "resume-prompt" ? (
          <ResumeDialog
            gameTitle="Tetris"
            onResume={onResume}
            onNewGame={handleNewGame}
          />
        ) : null}

        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}
      </div>

      <p className="text-xs text-muted-foreground">
        방향키(또는 스와이프)로 이동, 위쪽 화살표(또는 탭)로 회전, 스페이스로
        즉시 낙하하세요. 줄을 채우면 사라집니다.
      </p>
    </div>
  );
}

// ROWS is re-exported for consumers that need board sizing without pulling
// in the rest of the engine surface.
export { ROWS };
