"use client";

import { useGameSDK } from "@game-platform/game-sdk";
import { Button, cn, GameOverOverlay, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useReducer, useRef } from "react";

import {
  createInitialState,
  fire,
  GRID_SIZE,
  move,
  step,
  type Facing,
  type TankState,
} from "./engine";

const GAME_SLUG = "tank-battle";
const MAX_DT = 0.05;

type Action =
  | { type: "step"; dt: number }
  | { type: "move"; dir: Facing }
  | { type: "fire" }
  | { type: "restart" };

function reducer(state: TankState, action: Action): TankState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "move":
      return move(state, action.dir);
    case "fire":
      return fire(state);
    case "step":
      return step(state, action.dt);
    default:
      return state;
  }
}

function toPercentBox(x: number, y: number, size = 1): CSSProperties {
  return {
    left: `${(x / GRID_SIZE) * 100}%`,
    top: `${(y / GRID_SIZE) * 100}%`,
    width: `${(size / GRID_SIZE) * 100}%`,
    height: `${(size / GRID_SIZE) * 100}%`,
  };
}

const FACING_ROTATION: Record<Facing, string> = {
  up: "rotate(0deg)",
  right: "rotate(90deg)",
  down: "rotate(180deg)",
  left: "rotate(270deg)",
};

const DIRECTION_KEYS: Record<string, Facing> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

function BarrelIndicator({ facing }: { facing: Facing }) {
  return (
    <div
      className="absolute inset-0 flex items-start justify-center"
      style={{ transform: FACING_ROTATION[facing] }}
    >
      <div className="mt-[-2px] h-1/2 w-[15%] rounded-full bg-foreground/80" />
    </div>
  );
}

export function TankBattleGame() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const { reportScore } = useGameSDK();
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
      const dir = DIRECTION_KEYS[event.key];
      if (dir) {
        event.preventDefault();
        dispatch({ type: "move", dir });
        return;
      }
      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        dispatch({ type: "fire" });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="Score" value={state.score} />
          <ScoreBox
            label="Defeated"
            value={state.enemiesDefeated}
          />
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
        className="relative w-full max-w-sm touch-none select-none overflow-hidden rounded-xl bg-muted"
        style={{ aspectRatio: "1 / 1" }}
      >
        {state.grid.map((row, rowIndex) =>
          row.map((tile, colIndex) => {
            if (tile === "empty") {
              return null;
            }
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={cn(
                  "absolute",
                  tile === "brick" && "bg-amber-700/80",
                  tile === "steel" && "bg-slate-500",
                  tile === "water" && "bg-sky-500/70"
                )}
                style={toPercentBox(colIndex, rowIndex)}
              />
            );
          })
        )}

        {state.bullets.map((bullet, index) => (
          <div
            key={index}
            className="absolute flex items-center justify-center"
            style={toPercentBox(bullet.x, bullet.y)}
          >
            <div
              className={cn(
                "h-[20%] w-[20%] rounded-full",
                bullet.owner === "player" ? "bg-foreground" : "bg-destructive"
              )}
            />
          </div>
        ))}

        {state.enemy ? (
          <div
            className="absolute rounded-sm bg-destructive/80"
            style={toPercentBox(state.enemy.x, state.enemy.y)}
          >
            <BarrelIndicator facing={state.enemy.facing} />
          </div>
        ) : null}

        <div
          className="absolute rounded-sm bg-primary"
          style={toPercentBox(state.playerX, state.playerY)}
        >
          <BarrelIndicator facing={state.playerFacing} />
        </div>

        {state.status !== "playing" ? (
          <GameOverOverlay
            message={state.status === "won" ? "You Win!" : "Game Over"}
            onRestart={() => dispatch({ type: "restart" })}
          />
        ) : null}
      </div>

      <Button
        variant="secondary"
        className="w-full max-w-sm"
        onClick={() => dispatch({ type: "fire" })}
      >
        발사 (Space)
      </Button>

      <p className="text-xs text-muted-foreground">
        방향키로 탱크를 움직이고 스페이스바 또는 버튼으로 발사하세요. 벽돌은
        총알로 파괴할 수 있습니다.
      </p>
    </div>
  );
}
