"use client";

import {
  clearSave,
  ResumeDialog,
  SaveIndicator,
  useAutoSave,
  useGameSDK,
  useResumableGame,
} from "@game-platform/game-sdk";
import { Button, GameOverOverlay, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import type { CSSProperties, PointerEvent } from "react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  BALL_SIZE,
  brickRect,
  CAPSULE_SIZE,
  createInitialState,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_Y,
  STAGE_COUNT,
  step,
  type ArkanoidState,
  type Rect,
} from "./engine";

const GAME_SLUG = "arkanoid-dx";
const PADDLE_KEY_SPEED = 320;
const MAX_DT = 0.05;

type Action =
  | { type: "step"; dt: number }
  | { type: "setPaddleX"; x: number }
  | { type: "restart" };

function reducer(state: ArkanoidState, action: Action): ArkanoidState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "setPaddleX":
      return {
        ...state,
        paddleX: Math.max(0, Math.min(FIELD_WIDTH - state.paddleWidth, action.x)),
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

export function ArkanoidDxGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
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

      if (phaseRef.current === "ready" && stateRef.current.status === "playing") {
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
  }, [phaseRef]);

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
      if (phaseRef.current !== "ready") {
        return;
      }
      const field = fieldRef.current;
      if (!field) {
        return;
      }
      const rect = field.getBoundingClientRect();
      const relativeX = ((event.clientX - rect.left) / rect.width) * FIELD_WIDTH;
      dispatch({ type: "setPaddleX", x: relativeX - state.paddleWidth / 2 });
    },
    [phaseRef, state.paddleWidth]
  );

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="Score" value={state.score} />
          <ScoreBox label="Stage" value={state.stage + 1} />
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

        {state.capsules.map((capsule, index) => (
          <div
            key={index}
            className="absolute flex items-center justify-center rounded-full text-[9px] font-bold text-primary-foreground"
            style={{
              ...toPercentRect({
                x: capsule.x - CAPSULE_SIZE / 2,
                y: capsule.y - CAPSULE_SIZE / 2,
                width: CAPSULE_SIZE,
                height: CAPSULE_SIZE,
              }),
              backgroundColor: capsule.kind === "widen" ? "#3b82f6" : "#f97316",
            }}
          >
            {capsule.kind === "widen" ? "W" : "M"}
          </div>
        ))}

        {state.balls.map((ball, index) => (
          <div
            key={index}
            className="absolute rounded-full bg-foreground"
            style={toPercentRect({
              x: ball.x - BALL_SIZE / 2,
              y: ball.y - BALL_SIZE / 2,
              width: BALL_SIZE,
              height: BALL_SIZE,
            })}
          />
        ))}

        <div
          className="absolute rounded-full bg-primary"
          style={toPercentRect({
            x: state.paddleX,
            y: PADDLE_Y,
            width: state.paddleWidth,
            height: PADDLE_HEIGHT,
          })}
        />

        {state.status !== "playing" ? (
          <GameOverOverlay
            message={
              state.status === "won"
                ? `Clear! (${STAGE_COUNT} Stages)`
                : "Game Over"
            }
            onRestart={() => dispatch({ type: "restart" })}
          />
        ) : null}

        {phase === "resume-prompt" ? (
          <ResumeDialog
            gameTitle="Arkanoid DX"
            onResume={onResume}
            onNewGame={onNewGame}
          />
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        방향키 또는 드래그로 패들을 움직여 공을 받아치세요. 파란 캡슐(W)은
        패들을 넓히고, 주황 캡슐(M)은 공을 3개로 늘립니다. 3개 스테이지를
        모두 깨면 클리어!
      </p>
    </div>
  );
}
