"use client";

import { useGameSDK } from "@game-platform/game-sdk";
import { Button, cn, GameOverOverlay, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import type { TouchEvent } from "react";
import { useEffect, useReducer, useRef } from "react";

import {
  createInitialSnake,
  GRID_SIZE,
  isOpposite,
  placeFood,
  tick,
  type Direction,
  type Position,
} from "./engine";

const GAME_SLUG = "snake";
const TICK_MS = 150;
const SWIPE_THRESHOLD = 24;
const POINTS_PER_FOOD = 10;

type Status = "playing" | "over";

interface State {
  snake: Position[];
  direction: Direction;
  pendingDirection: Direction;
  food: Position;
  score: number;
  status: Status;
}

type Action =
  | { type: "tick" }
  | { type: "setDirection"; direction: Direction }
  | { type: "restart" };

function createInitialState(): State {
  const snake = createInitialSnake();
  return {
    snake,
    direction: "right",
    pendingDirection: "right",
    food: placeFood(snake),
    score: 0,
    status: "playing",
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "setDirection": {
      if (state.status === "over" || isOpposite(action.direction, state.direction)) {
        return state;
      }
      return { ...state, pendingDirection: action.direction };
    }
    case "tick": {
      if (state.status === "over") {
        return state;
      }
      const result = tick(state.snake, state.pendingDirection, state.food);
      if (result.gameOver) {
        return { ...state, status: "over" };
      }
      const score = result.ateFood ? state.score + POINTS_PER_FOOD : state.score;
      const food = result.ateFood ? placeFood(result.snake) : state.food;
      return {
        ...state,
        snake: result.snake,
        direction: state.pendingDirection,
        food,
        score,
      };
    }
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

export function SnakeGame() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const { reportScore } = useGameSDK();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (state.status !== "playing") {
      return;
    }
    const id = setInterval(() => dispatch({ type: "tick" }), TICK_MS);
    return () => clearInterval(id);
  }, [state.status]);

  useEffect(() => {
    if (state.status !== "playing") {
      reportScore(GAME_SLUG, state.score);
    }
  }, [state.status, state.score, reportScore]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const direction = DIRECTION_KEYS[event.key];
      if (!direction) {
        return;
      }
      event.preventDefault();
      dispatch({ type: "setDirection", direction });
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const snakeCells = new Set(state.snake.map((s) => `${s.x},${s.y}`));
  const head = state.snake[0]!;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Score" value={state.score} />
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
        className="relative grid aspect-square w-full max-w-sm touch-none select-none gap-px rounded-xl bg-muted p-1"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
          const x = index % GRID_SIZE;
          const y = Math.floor(index / GRID_SIZE);
          const isFood = state.food.x === x && state.food.y === y;
          const isHead = head.x === x && head.y === y;
          const isBody = !isHead && snakeCells.has(`${x},${y}`);
          return (
            <div
              key={index}
              className={cn(
                "rounded-[2px]",
                isFood && "bg-destructive",
                isHead && "bg-primary",
                isBody && "bg-primary/60"
              )}
            />
          );
        })}

        {state.status === "over" ? (
          <GameOverOverlay
            message="Game Over"
            onRestart={() => dispatch({ type: "restart" })}
          />
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        방향키 또는 스와이프로 뱀을 조종하세요.
      </p>
    </div>
  );
}
