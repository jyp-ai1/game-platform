"use client";

import {
  clearSave,
  ResumeDialog,
  SaveIndicator,
  standardFeelFromState,
  StandardGameOverOverlay,
  useAutoSave,
  useGameSDK,
  emitGameRetry,
  useReadyCountdown,
  useResumableGame,
  useStandardGameFeel,
  playGameFeel,
  GameFeelLayer,
} from "@game-platform/game-sdk";
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import type { TouchEvent } from "react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  createInitialSnake,
  GRID_SIZE,
  isOpposite,
  placeFood,
  tick,
  type Direction,
  type Position,
} from "./engine";
import { playGameOverAudio, playStageClearAudio, primeGameAudio, resetGameAudioPrime } from "./game-audio-prime";

const GAME_SLUG = "snake";
const TICK_MS = 165;
const MIN_TICK_MS = 85;
const SWIPE_THRESHOLD = 24;
const POINTS_PER_FOOD = 10;

type Status = "playing" | "over" | "won";

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
    food: placeFood(snake) ?? { x: 0, y: 0 },
    score: 0,
    status: "playing",
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "setDirection": {
      if (state.status !== "playing" || isOpposite(action.direction, state.direction)) {
        return state;
      }
      return { ...state, pendingDirection: action.direction };
    }
    case "tick": {
      if (state.status !== "playing") {
        return state;
      }
      const result = tick(state.snake, state.pendingDirection, state.food);
      if (result.gameOver) {
        return { ...state, status: "over" };
      }
      const score = result.ateFood ? state.score + POINTS_PER_FOOD : state.score;
      if (result.ateFood) {
        const nextFood = placeFood(result.snake);
        if (nextFood === null) {
          return {
            ...state,
            snake: result.snake,
            direction: state.pendingDirection,
            score,
            status: "won",
          };
        }
        return {
          ...state,
          snake: result.snake,
          direction: state.pendingDirection,
          food: nextFood,
          score,
        };
      }
      return {
        ...state,
        snake: result.snake,
        direction: state.pendingDirection,
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
  const prevScoreRef = useRef(0);
  const prevStatusRef = useRef(state.status);
  const sessionStartedRef = useRef(false);
  
  useEffect(() => {
    if (canPlay && !sessionStartedRef.current) {
      sessionStartedRef.current = true;
      playGameFeel("button", fieldRef.current);
    }
  }, [canPlay]);

  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      playGameFeel("pop", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

  useEffect(() => {
    if (state.status === "won" && prevStatusRef.current !== "won") {
      playStageClearAudio();
    } else if (state.status === "over" && prevStatusRef.current !== "over") {
      playGameOverAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    fieldRef,
  });
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
    const ms = Math.max(MIN_TICK_MS, TICK_MS - Math.floor(state.score / 30) * 10);
    const id = setInterval(() => dispatch({ type: "tick" }), ms);
    return () => clearInterval(id);
  }, [state.status, canPlay, state.score]);

  useEffect(() => {
    if (state.status !== "playing") {
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
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
      primeGameAudio();
      playGameFeel("button", fieldRef.current);
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
    primeGameAudio();
    playGameFeel("button", fieldRef.current);
    dispatch({ type: "setDirection", direction });
  }

  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  const snakeCells = new Set(state.snake.map((s) => `${s.x},${s.y}`));
  const head = state.snake[0]!;


  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    resetGameAudioPrime();
    prevScoreRef.current = 0;
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    resetGameAudioPrime();
    prevScoreRef.current = 0;
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Score" value={state.score} />
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
        className="relative grid aspect-square w-full max-w-sm touch-none select-none gap-px rounded-xl bg-muted p-1 transition-transform duration-150"
        ref={fieldRef}
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

        {state.status !== "playing" ? (
          <StandardGameOverOverlay
            message={state.status === "won" ? "You Win!" : "Game Over"}
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

        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}

        {phase === "resume-prompt" ? (
          <ResumeDialog
            gameTitle="Snake"
            onResume={onResume}
            onNewGame={handleNewGame}
          />
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        방향키 또는 스와이프로 뱀을 조종하세요.
      </p>
    </div>
  );
}
