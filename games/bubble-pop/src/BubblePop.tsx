"use client";

import { useGameSDK } from "@game-platform/game-sdk";
import { Button, cn, GameOverOverlay, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import type { CSSProperties, PointerEvent } from "react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  BUBBLE_SIZE,
  type BubbleColor,
  type BubblePopState,
  createInitialState,
  fireBubble,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  MAX_AIM_ANGLE,
  ROWS,
  setShooterAngle,
  SHOOTER_X,
  SHOOTER_Y,
  step,
} from "./engine";

const GAME_SLUG = "bubble-pop";
const MAX_DT = 0.05;
const AIM_LINE_LENGTH = 60;

const COLOR_CLASSES: Record<BubbleColor, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  purple: "bg-purple-500",
};

type Action =
  | { type: "step"; dt: number }
  | { type: "setAngle"; angle: number }
  | { type: "fire" }
  | { type: "restart" };

function reducer(state: BubblePopState, action: Action): BubblePopState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "setAngle":
      return setShooterAngle(state, action.angle);
    case "fire":
      return fireBubble(state);
    case "step":
      return step(state, action.dt);
    default:
      return state;
  }
}

function toPercent(value: number, total: number): string {
  return `${(value / total) * 100}%`;
}

function bubbleStyle(row: number, col: number): CSSProperties {
  const isOdd = row % 2 === 1;
  const x = col * BUBBLE_SIZE + (isOdd ? BUBBLE_SIZE / 2 : 0);
  const y = row * BUBBLE_SIZE;
  return {
    left: toPercent(x, FIELD_WIDTH),
    top: toPercent(y, FIELD_HEIGHT),
    width: toPercent(BUBBLE_SIZE, FIELD_WIDTH),
    height: toPercent(BUBBLE_SIZE, FIELD_HEIGHT),
  };
}

export function BubblePopGame() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    function loop(time: number) {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }
      const dt = Math.min(MAX_DT, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;

      if (stateRef.current.status === "playing") {
        dispatch({ type: "step", dt });
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (state.status !== "playing") {
      reportScore(GAME_SLUG, state.score);
    }
  }, [state.status, state.score, reportScore]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code === "Space") {
        event.preventDefault();
        dispatch({ type: "fire" });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const field = fieldRef.current;
    if (!field) {
      return;
    }
    const rect = field.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * FIELD_WIDTH;
    const relativeY = ((event.clientY - rect.top) / rect.height) * FIELD_HEIGHT;
    const angle = Math.atan2(relativeX - SHOOTER_X, SHOOTER_Y - relativeY);
    dispatch({ type: "setAngle", angle });
  }, []);

  const handlePointerDown = useCallback(() => {
    dispatch({ type: "fire" });
  }, []);

  const aimX2 = SHOOTER_X + Math.sin(state.shooterAngle) * AIM_LINE_LENGTH;
  const aimY2 = SHOOTER_Y - Math.cos(state.shooterAngle) * AIM_LINE_LENGTH;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex items-center gap-2">
          <ScoreBox label="Score" value={state.score} />
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">
              Next
            </span>
            <span
              className={cn(
                "block h-3 w-3 rounded-full",
                COLOR_CLASSES[state.nextColor]
              )}
            />
          </div>
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
        ref={fieldRef}
        className="relative w-full max-w-sm touch-none select-none overflow-hidden rounded-xl bg-muted"
        style={{ aspectRatio: `${FIELD_WIDTH} / ${FIELD_HEIGHT}` }}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
      >
        {/* bottom danger line */}
        <div
          className="absolute inset-x-0 border-t-2 border-dashed border-destructive/60"
          style={{ top: toPercent((ROWS - 1) * BUBBLE_SIZE, FIELD_HEIGHT) }}
        />

        {state.grid.map((rowColors, row) =>
          rowColors.map((color, col) =>
            color ? (
              <div
                key={`${row}-${col}`}
                className={cn(
                  "absolute rounded-full",
                  COLOR_CLASSES[color]
                )}
                style={bubbleStyle(row, col)}
              />
            ) : null
          )
        )}

        {state.flyingBubble ? (
          <div
            className={cn(
              "absolute rounded-full",
              COLOR_CLASSES[state.flyingBubble.color]
            )}
            style={{
              left: toPercent(state.flyingBubble.x - BUBBLE_SIZE / 2, FIELD_WIDTH),
              top: toPercent(state.flyingBubble.y - BUBBLE_SIZE / 2, FIELD_HEIGHT),
              width: toPercent(BUBBLE_SIZE, FIELD_WIDTH),
              height: toPercent(BUBBLE_SIZE, FIELD_HEIGHT),
            }}
          />
        ) : null}

        {/* aim line */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <line
            x1={SHOOTER_X}
            y1={SHOOTER_Y}
            x2={aimX2}
            y2={aimY2}
            stroke="currentColor"
            strokeWidth={2}
            strokeDasharray="4 4"
            className="text-foreground/50"
          />
        </svg>

        {/* shooter bubble */}
        <div
          className={cn(
            "absolute rounded-full ring-2 ring-foreground/40",
            COLOR_CLASSES[state.currentColor]
          )}
          style={{
            left: toPercent(SHOOTER_X - BUBBLE_SIZE / 2, FIELD_WIDTH),
            top: toPercent(SHOOTER_Y - BUBBLE_SIZE / 2, FIELD_HEIGHT),
            width: toPercent(BUBBLE_SIZE, FIELD_WIDTH),
            height: toPercent(BUBBLE_SIZE, FIELD_HEIGHT),
          }}
        />

        {state.status !== "playing" ? (
          <GameOverOverlay
            message={state.status === "won" ? "You Win!" : "Game Over"}
            onRestart={() => dispatch({ type: "restart" })}
          />
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        마우스로 조준하고 클릭하거나 스페이스바를 눌러 버블을 발사하세요. 같은
        색 버블 3개 이상을 모으면 터집니다.
      </p>
    </div>
  );
}
