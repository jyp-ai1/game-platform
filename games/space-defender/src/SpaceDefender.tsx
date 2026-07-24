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
  BULLET_HEIGHT,
  BULLET_WIDTH,
  createInitialState,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  firePlayerBullet,
  INVADER_ROWS,
  INVADER_SIZE,
  invaderCellRect,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_Y,
  setPlayerX,
  SHIELD_HEIGHT,
  SHIELD_STARTING_HP,
  SHIELD_WIDTH,
  step,
  type SpaceDefenderState,
} from "./engine";

const GAME_SLUG = "space-defender";
const PLAYER_KEY_SPEED = 240;
const MAX_DT = 0.05;

type Action =
  | { type: "step"; dt: number }
  | { type: "setPlayerX"; x: number }
  | { type: "fire" }
  | { type: "restart" };

function reducer(state: SpaceDefenderState, action: Action): SpaceDefenderState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "setPlayerX":
      return setPlayerX(state, action.x);
    case "fire":
      return firePlayerBullet(state);
    case "step":
      return step(state, action.dt);
    default:
      return state;
  }
}

function toPercentRect(x: number, y: number, width: number, height: number): CSSProperties {
  return {
    left: `${(x / FIELD_WIDTH) * 100}%`,
    top: `${(y / FIELD_HEIGHT) * 100}%`,
    width: `${(width / FIELD_WIDTH) * 100}%`,
    height: `${(height / FIELD_HEIGHT) * 100}%`,
  };
}

export function SpaceDefenderGame() {
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
      if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === " ") {
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
      dispatch({ type: "setPlayerX", x: relativeX - PLAYER_WIDTH / 2 });
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
        className="relative w-full max-w-sm touch-none select-none overflow-hidden rounded-xl bg-slate-950"
        style={{ aspectRatio: `${FIELD_WIDTH} / ${FIELD_HEIGHT}` }}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
      >
        {state.invaders.alive.map((row, rowIndex) =>
          row.map((isAlive, colIndex) => {
            if (!isAlive) {
              return null;
            }
            const rect = invaderCellRect(state.invaders, rowIndex, colIndex);
            const isFrontRow = rowIndex === INVADER_ROWS - 1;
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={
                  isFrontRow
                    ? "absolute rounded-[2px] bg-emerald-400 shadow-[0_2px_6px_rgba(52,211,153,0.6)]"
                    : "absolute rounded-[2px] bg-emerald-500/80"
                }
                style={toPercentRect(rect.x, rect.y, rect.width, rect.height)}
              />
            );
          })
        )}

        {state.shields.map((shield, index) => (
          <div
            key={index}
            className="absolute rounded-sm bg-orange-400"
            style={{
              ...toPercentRect(shield.x, shield.y, SHIELD_WIDTH, SHIELD_HEIGHT),
              opacity: Math.max(0.15, shield.hp / SHIELD_STARTING_HP),
            }}
          />
        ))}

        {state.bullets.map((bullet, index) => (
          <div
            key={index}
            className={
              bullet.owner === "player"
                ? "absolute rounded-full bg-sky-300"
                : "absolute rounded-full bg-red-400"
            }
            style={toPercentRect(
              bullet.x - BULLET_WIDTH / 2,
              bullet.y - BULLET_HEIGHT / 2,
              BULLET_WIDTH,
              BULLET_HEIGHT
            )}
          />
        ))}

        <div
          className="absolute rounded-sm bg-sky-400"
          style={toPercentRect(state.playerX, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT)}
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
            gameTitle="Space Defender"
            onResume={onResume}
            onNewGame={onNewGame}
          />
        ) : null}

        {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      </div>

      <p className="text-xs text-muted-foreground">
        방향키 또는 드래그로 이동, 스페이스바 또는 탭으로 발사하세요.
      </p>
    </div>
  );
}
