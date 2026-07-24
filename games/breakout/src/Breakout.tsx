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
import type { CSSProperties, PointerEvent } from "react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  BALL_SIZE,
  brickRect,
  createInitialState,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_Y,
  step,
  type BreakoutState,
  type Rect,
} from "./engine";

const GAME_SLUG = "breakout";
const PADDLE_KEY_SPEED = 320;
const MAX_DT = 0.05;

type Action =
  | { type: "step"; dt: number }
  | { type: "setPaddleX"; x: number }
  | { type: "restart" };

function reducer(state: BreakoutState, action: Action): BreakoutState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "setPaddleX":
      return {
        ...state,
        paddleX: Math.max(0, Math.min(FIELD_WIDTH - PADDLE_WIDTH, action.x)),
      };
    case "step":
      return step(state, action.dt);
    default:
      return state;
  }
}

function toPercentRect(rect: Rect): CSSProperties {
  return {
    left: `${(rect.x / FIELD_WIDTH) * 100}%`,
    top: `${(rect.y / FIELD_HEIGHT) * 100}%`,
    width: `${(rect.width / FIELD_WIDTH) * 100}%`,
    height: `${(rect.height / FIELD_HEIGHT) * 100}%`,
  };
}

export function BreakoutGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const keysRef = useRef<Set<string>>(new Set());
  const fieldRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status !== "playing" ? null : state),
    [state]
  );

  useEffect(() => {
    function loop(time: number) {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }
      const dt = Math.min(MAX_DT, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;

      // Keep the rAF chain alive while gated (Resume Dialog showing) so
      // ticking resumes immediately once it's dismissed, without dispatching
      // in the meantime.
      if (canPlayRef.current && stateRef.current.status === "playing") {
        let dx = 0;
        if (keysRef.current.has("ArrowLeft")) {
          dx -= 1;
        }
        if (keysRef.current.has("ArrowRight")) {
          dx += 1;
        }
        if (dx !== 0) {
          dispatch({
            type: "setPaddleX",
            x: stateRef.current.paddleX + dx * PADDLE_KEY_SPEED * dt,
          });
        }
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
  }, [canPlayRef]);

  useEffect(() => {
    if (state.status !== "playing") {
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, reportScore]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        keysRef.current.add(event.key);
      }
    }
    function handleKeyUp(event: KeyboardEvent) {
      keysRef.current.delete(event.key);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!canPlayRef.current) {
        return;
      }
      const field = fieldRef.current;
      if (!field) {
        return;
      }
      const rect = field.getBoundingClientRect();
      const relativeX =
        ((event.clientX - rect.left) / rect.width) * FIELD_WIDTH;
      dispatch({ type: "setPaddleX", x: relativeX - PADDLE_WIDTH / 2 });
    },
    [canPlayRef]
  );

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
        ref={fieldRef}
        className="relative w-full max-w-sm touch-none select-none overflow-hidden rounded-xl bg-muted"
        style={{ aspectRatio: `${FIELD_WIDTH} / ${FIELD_HEIGHT}` }}
        onPointerMove={handlePointerMove}
      >
        {state.bricks.map((alive, index) =>
          alive ? (
            <div
              key={index}
              className="absolute rounded-sm bg-primary/70"
              style={toPercentRect(brickRect(index))}
            />
          ) : null
        )}

        <div
          className="absolute rounded-full bg-foreground"
          style={toPercentRect({
            x: state.ball.x - BALL_SIZE / 2,
            y: state.ball.y - BALL_SIZE / 2,
            width: BALL_SIZE,
            height: BALL_SIZE,
          })}
        />

        <div
          className="absolute rounded-full bg-primary"
          style={toPercentRect({
            x: state.paddleX,
            y: PADDLE_Y,
            width: PADDLE_WIDTH,
            height: PADDLE_HEIGHT,
          })}
        />

        {state.status !== "playing" ? (
          <GameOverOverlay
            message={state.status === "won" ? "You Win!" : "Game Over"}
            score={state.score}
            gameSlug={GAME_SLUG}
            onRetry={() => emitGameRetry(GAME_SLUG)}
            onRestart={() => dispatch({ type: "restart" })}
          />
        ) : null}

        {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}

        {phase === "resume-prompt" ? (
          <ResumeDialog
            gameTitle="Breakout"
            onResume={onResume}
            onNewGame={onNewGame}
          />
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        방향키 또는 드래그로 패들을 움직여 공을 받아치세요.
      </p>
    </div>
  );
}
