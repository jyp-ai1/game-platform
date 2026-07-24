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
  BULLET_HEIGHT,
  BULLET_WIDTH,
  createInitialState,
  ENEMY_SIZE,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  firePlayerBullet,
  PLAYER_SIZE,
  PLAYER_X,
  setPlayerY,
  step,
  type SpaceImpactState,
} from "./engine";

const GAME_SLUG = "space-impact";
const PLAYER_KEY_SPEED = 240;
const MAX_DT = 0.05;

type Action =
  | { type: "step"; dt: number }
  | { type: "setPlayerY"; y: number }
  | { type: "fire" }
  | { type: "restart" };

function reducer(state: SpaceImpactState, action: Action): SpaceImpactState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "setPlayerY":
      return setPlayerY(state, action.y);
    case "fire":
      return firePlayerBullet(state);
    case "step":
      return step(state, action.dt);
    default:
      return state;
  }
}

function toPercentRect(
  x: number,
  y: number,
  width: number,
  height: number
): CSSProperties {
  return {
    left: `${(x / FIELD_WIDTH) * 100}%`,
    top: `${(y / FIELD_HEIGHT) * 100}%`,
    width: `${(width / FIELD_WIDTH) * 100}%`,
    height: `${(height / FIELD_HEIGHT) * 100}%`,
  };
}

export function SpaceImpactGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
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

      if (canPlayRef.current && stateRef.current.status === "playing") {
        let dy = 0;
        if (keysRef.current.has("ArrowUp")) {
          dy -= 1;
        }
        if (keysRef.current.has("ArrowDown")) {
          dy += 1;
        }
        if (dy !== 0) {
          dispatch({
            type: "setPlayerY",
            y: stateRef.current.playerY + dy * PLAYER_KEY_SPEED * dt,
          });
        }
        if (keysRef.current.has(" ")) {
          dispatch({ type: "fire" });
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
      if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === " ") {
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
      const relativeY = ((event.clientY - rect.top) / rect.height) * FIELD_HEIGHT;
      dispatch({ type: "setPlayerY", y: relativeY - PLAYER_SIZE / 2 });
    },
    [canPlayRef]
  );

  const handlePointerDown = useCallback(() => {
    if (!canPlayRef.current) {
      return;
    }
    dispatch({ type: "fire" });
  }, [canPlayRef]);

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-md items-center justify-between">
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
        className="relative w-full max-w-md touch-none select-none overflow-hidden rounded-xl bg-slate-950"
        style={{ aspectRatio: `${FIELD_WIDTH} / ${FIELD_HEIGHT}` }}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
      >
        {state.enemies.map((enemy, index) => (
          <div
            key={index}
            className="absolute rounded-sm bg-red-400"
            style={toPercentRect(enemy.x, enemy.y, ENEMY_SIZE, ENEMY_SIZE)}
          />
        ))}

        {state.bullets.map((bullet, index) => (
          <div
            key={index}
            className="absolute rounded-full bg-sky-300"
            style={toPercentRect(
              bullet.x,
              bullet.y - BULLET_HEIGHT / 2,
              BULLET_WIDTH,
              BULLET_HEIGHT
            )}
          />
        ))}

        <div
          className="absolute rounded-sm bg-emerald-400"
          style={toPercentRect(PLAYER_X, state.playerY, PLAYER_SIZE, PLAYER_SIZE)}
        />

        {state.status !== "playing" ? (
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
            gameTitle="Space Impact"
            onResume={onResume}
            onNewGame={onNewGame}
          />
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        방향키 또는 드래그로 상하 이동, 스페이스바 또는 탭으로 발사하세요.
      </p>
    </div>
  );
}
