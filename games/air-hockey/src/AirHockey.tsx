"use client";

import { useGameSDK } from "@game-platform/game-sdk";
import { Button, GameOverOverlay, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import type { CSSProperties, PointerEvent } from "react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  createInitialState,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  movePlayerPaddle,
  PADDLE_RADIUS,
  PUCK_RADIUS,
  step,
  type AirHockeyState,
} from "./engine";

const GAME_SLUG = "air-hockey";
const MAX_DT = 0.05;

type Action =
  | { type: "step"; dt: number }
  | { type: "movePlayer"; target: { x: number; y: number } }
  | { type: "restart" };

function reducer(state: AirHockeyState, action: Action): AirHockeyState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "movePlayer":
      return movePlayerPaddle(state, action.target);
    case "step":
      return step(state, action.dt);
    default:
      return state;
  }
}

function toPercent(x: number, y: number, radius: number): CSSProperties {
  return {
    left: `${((x - radius) / FIELD_WIDTH) * 100}%`,
    top: `${((y - radius) / FIELD_HEIGHT) * 100}%`,
    width: `${((radius * 2) / FIELD_WIDTH) * 100}%`,
    height: `${((radius * 2) / FIELD_HEIGHT) * 100}%`,
  };
}

export function AirHockeyGame() {
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
      // Reported regardless of win/loss — "most goals scored in a match" is
      // a meaningful leaderboard metric even for a losing game, matching
      // how Breakout reports its final score independent of outcome.
      reportScore(GAME_SLUG, state.playerScore);
    }
  }, [state.status, state.playerScore, reportScore]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const field = fieldRef.current;
    if (!field) {
      return;
    }
    const rect = field.getBoundingClientRect();
    const target = {
      x: ((event.clientX - rect.left) / rect.width) * FIELD_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * FIELD_HEIGHT,
    };
    dispatch({ type: "movePlayer", target });
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="You" value={state.playerScore} />
          <ScoreBox label="CPU" value={state.aiScore} />
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
        {/* Center line */}
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-foreground/20" />
        {/* Goal mouths */}
        <div
          className="absolute top-0 h-1 -translate-x-1/2 bg-destructive"
          style={{ left: "50%", width: `${(140 / FIELD_WIDTH) * 100}%` }}
        />
        <div
          className="absolute bottom-0 h-1 -translate-x-1/2 bg-primary"
          style={{ left: "50%", width: `${(140 / FIELD_WIDTH) * 100}%` }}
        />

        <div
          className="absolute rounded-full bg-foreground"
          style={toPercent(state.puck.x, state.puck.y, PUCK_RADIUS)}
        />
        <div
          className="absolute rounded-full bg-destructive/80"
          style={toPercent(state.aiPaddle.x, state.aiPaddle.y, PADDLE_RADIUS)}
        />
        <div
          className="absolute rounded-full bg-primary"
          style={toPercent(
            state.playerPaddle.x,
            state.playerPaddle.y,
            PADDLE_RADIUS
          )}
        />

        {state.status !== "playing" ? (
          <GameOverOverlay
            message={state.winner === "player" ? "You Win!" : "Game Over"}
            onRestart={() => dispatch({ type: "restart" })}
          />
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        드래그(또는 터치)로 패들을 움직여 퍽을 쳐내세요. 7점을 먼저 획득하면
        승리합니다.
      </p>
    </div>
  );
}
