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
import { Button, GameOverOverlay, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import type { CSSProperties, PointerEvent } from "react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  createInitialState,
  ENEMY_HEIGHT,
  ENEMY_WIDTH,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  firePlayerBullet,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_Y,
  setPlayerX,
  step,
  type Bullet,
  type Enemy,
  type GalaxyState,
} from "./engine";

const GAME_SLUG = "galaxy-defender";
const PLAYER_KEY_SPEED = 300;
const MAX_DT = 0.05;
const BULLET_WIDTH = 4;
const BULLET_HEIGHT = 8;

type Action =
  | { type: "step"; dt: number }
  | { type: "setPlayerX"; x: number }
  | { type: "restart" };

function reducer(state: GalaxyState, action: Action): GalaxyState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "setPlayerX":
      return setPlayerX(state, action.x);
    case "step": {
      const fired = firePlayerBullet(state);
      return step(fired, action.dt);
    }
    default:
      return state;
  }
}

function toPercentBox(
  centerX: number,
  centerY: number,
  width: number,
  height: number
): CSSProperties {
  return {
    left: `${((centerX - width / 2) / FIELD_WIDTH) * 100}%`,
    top: `${((centerY - height / 2) / FIELD_HEIGHT) * 100}%`,
    width: `${(width / FIELD_WIDTH) * 100}%`,
    height: `${(height / FIELD_HEIGHT) * 100}%`,
  };
}

function enemyClassName(enemy: Enemy): string {
  if (enemy.state === "diving") {
    return "absolute scale-110 rounded-sm bg-destructive transition-transform";
  }
  if (enemy.state === "returning") {
    return "absolute rounded-sm bg-primary/60 transition-transform";
  }
  return "absolute rounded-sm bg-primary/80 transition-transform";
}

function bulletClassName(bullet: Bullet): string {
  return bullet.owner === "player"
    ? "absolute rounded-full bg-foreground"
    : "absolute rounded-full bg-destructive";
}

export function GalaxyDefenderGame() {
  const { phase, initialState, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
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

      if (stateRef.current.status === "playing" && canPlayRef.current) {
        let dx = 0;
        if (keysRef.current.has("ArrowLeft")) {
          dx -= 1;
        }
        if (keysRef.current.has("ArrowRight")) {
          dx += 1;
        }
        if (dx !== 0) {
          dispatch({
            type: "setPlayerX",
            x: stateRef.current.playerX + dx * PLAYER_KEY_SPEED * dt,
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
  }, [canPlayRef]);

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
      const relativeX = ((event.clientX - rect.left) / rect.width) * FIELD_WIDTH;
      dispatch({ type: "setPlayerX", x: relativeX });
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
          <ScoreBox label="Wave" value={state.wave} />
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
        {state.enemies.map((enemy) => (
          <div
            key={enemy.id}
            className={enemyClassName(enemy)}
            style={toPercentBox(enemy.pos.x, enemy.pos.y, ENEMY_WIDTH, ENEMY_HEIGHT)}
          />
        ))}

        {state.bullets.map((bullet, index) => (
          <div
            key={index}
            className={bulletClassName(bullet)}
            style={toPercentBox(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT)}
          />
        ))}

        <div
          className="absolute rounded-sm bg-foreground"
          style={toPercentBox(state.playerX, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT)}
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

        {phase === "resume-prompt" ? (
          <ResumeDialog
            gameTitle="Galaxy Defender"
            onResume={onResume}
            onNewGame={onNewGame}
          />
        ) : null}

        {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      </div>

      <p className="text-xs text-muted-foreground">
        방향키 또는 드래그로 함선을 움직이세요. 자동으로 발사됩니다.
      </p>
    </div>
  );
}
