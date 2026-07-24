"use client";

import {
  clearSave,
  ResumeDialog,
  SaveIndicator,
  useAutoSave,
  useGameSDK,
  emitGameRetry,
  useReadyCountdown,
  useResumableGame,
} from "@game-platform/game-sdk";
import { Button, GameOverOverlay, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import type { TouchEvent } from "react";
import { useEffect, useReducer, useRef } from "react";

import {
  activeCells,
  COLS,
  createInitialState,
  gravityIntervalMs,
  hardDropRow,
  lockPiece,
  ROWS,
  TETROMINO_COLORS,
  tryMove,
  tryRotate,
  type TetrisState,
} from "./engine";

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
    case "softDrop":
    case "tick": {
      if (state.status !== "playing") {
        return state;
      }
      const moved = tryMove(state.board, state.active, 0, 1);
      return moved ? { ...state, active: moved } : lockPiece(state);
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
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "over" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status !== "playing" || !canPlay) {
      return;
    }
    const id = setInterval(
      () => dispatch({ type: "tick" }),
      gravityIntervalMs(state.level)
    );
    return () => clearInterval(id);
  }, [state.status, state.level, canPlay]);

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, reportScore]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!canPlayRef.current) {
        return;
      }
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          dispatch({ type: "move", dCol: -1 });
          break;
        case "ArrowRight":
          event.preventDefault();
          dispatch({ type: "move", dCol: 1 });
          break;
        case "ArrowDown":
          event.preventDefault();
          dispatch({ type: "softDrop" });
          break;
        case "ArrowUp":
          event.preventDefault();
          dispatch({ type: "rotate" });
          break;
        case " ":
          event.preventDefault();
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

  const activeCellSet = new Set(
    activeCells(state.active).map(({ row, col }) => `${row},${col}`)
  );
  const activeColor = TETROMINO_COLORS[state.active.type];

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="Score" value={state.score} />
          <ScoreBox label="Level" value={state.level} />
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
        className="relative grid aspect-[1/2] w-full max-w-xs touch-none select-none gap-px rounded-xl bg-muted p-1"
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
          <GameOverOverlay
            message="Game Over"
            score={state.score}
            gameSlug={GAME_SLUG}
            onRetry={() => emitGameRetry(GAME_SLUG)}
            onRestart={() => dispatch({ type: "restart" })}
          />
        ) : null}

        {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}

        {phase === "resume-prompt" ? (
          <ResumeDialog
            gameTitle="Tetris"
            onResume={onResume}
            onNewGame={onNewGame}
          />
        ) : null}
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
