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
import { RotateCcw } from "lucide-react";
import type { TouchEvent } from "react";
import { useEffect, useReducer, useRef } from "react";

import {
  COLS,
  createInitialState,
  ROWS,
  setQueuedDirection,
  step,
  type Direction,
  type MazeState,
} from "./engine";

const GAME_SLUG = "maze-runner";
const TICK_MS = 130;
const SWIPE_THRESHOLD = 24;

type Action =
  | { type: "tick" }
  | { type: "setDirection"; direction: Direction }
  | { type: "restart" };

function reducer(state: MazeState, action: Action): MazeState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "setDirection":
      return setQueuedDirection(state, action.direction);
    case "tick":
      return step(state, TICK_MS / 1000);
    default:
      return state;
  }
}

const DIRECTION_KEYS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const CHASER_COLORS = ["bg-destructive", "bg-secondary-foreground", "bg-accent-foreground"];

export function MazeRunnerGame() {
  const { phase, initialState, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status !== "playing" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status !== "playing" || !canPlay) {
      return;
    }
    const id = setInterval(() => dispatch({ type: "tick" }), TICK_MS);
    return () => clearInterval(id);
  }, [state.status, canPlay]);

  useEffect(() => {
    if (state.status === "over" || state.status === "won") {
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, reportScore]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!canPlayRef.current) {
        return;
      }
      const direction = DIRECTION_KEYS[event.key];
      if (!direction) {
        return;
      }
      event.preventDefault();
      dispatch({ type: "setDirection", direction });
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
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) {
      return;
    }
    const direction: Direction =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "right"
          : "left"
        : dy > 0
          ? "down"
          : "up";
    dispatch({ type: "setDirection", direction });
  }

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="Score" value={state.score} />
          <ScoreBox label="Lives" value={state.lives} />
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
        className="relative grid w-full max-w-sm touch-none select-none gap-0 rounded-xl bg-muted p-1"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          aspectRatio: `${COLS} / ${ROWS}`,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {state.grid.map((row, y) =>
          row.map((cell, x) => {
            const isPlayer = state.playerX === x && state.playerY === y;
            const chaser = state.chasers.find((c) => c.x === x && c.y === y);
            return (
              <div
                key={`${x},${y}`}
                className={cn("relative flex items-center justify-center", cell === "wall" && "bg-primary/20 rounded-[2px]")}
              >
                {cell === "dot" ? (
                  <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                ) : null}
                {cell === "power" ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                ) : null}
                {chaser ? (
                  <span
                    className={cn(
                      "absolute inset-[15%] rounded-full",
                      chaser.mode === "frightened"
                        ? "bg-accent"
                        : CHASER_COLORS[chaser.id % CHASER_COLORS.length]
                    )}
                  />
                ) : null}
                {isPlayer ? (
                  <span className="absolute inset-[10%] rounded-full bg-primary" />
                ) : null}
              </div>
            );
          })
        )}

        {state.status !== "playing" ? (
          <GameOverOverlay
            message={state.status === "won" ? "You Win!" : "Game Over"}
            score={state.score}
            gameSlug={GAME_SLUG}
            onRetry={() => emitGameRetry(GAME_SLUG)}
            onRestart={() => dispatch({ type: "restart" })}
          />
        ) : null}

        {phase === "resume-prompt" ? (
          <ResumeDialog
            gameTitle="Maze Runner"
            onResume={onResume}
            onNewGame={onNewGame}
          />
        ) : null}

        {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      </div>

      <p className="text-xs text-muted-foreground">
        방향키 또는 스와이프로 이동하세요. 파워 펠릿을 먹으면 잠시 추격자를 역으로 공격할 수 있습니다.
      </p>
    </div>
  );
}
