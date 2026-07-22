"use client";

import {
  clearSave,
  getBestScore,
  ResumeDialog,
  SaveIndicator,
  useAutoSave,
  useGameSDK,
  useResumableGame,
} from "@game-platform/game-sdk";
import { Button, GameOverOverlay, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import type { CSSProperties, TouchEvent } from "react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  addRandomTile,
  createInitialGrid,
  hasMovesAvailable,
  hasWon,
  move,
  type Direction,
  type Grid,
} from "./engine";

const GAME_SLUG = "2048";
const SWIPE_THRESHOLD = 24;

type Status = "playing" | "won" | "over";

interface State {
  grid: Grid;
  score: number;
  best: number;
  status: Status;
}

type Action = { type: "move"; direction: Direction } | { type: "restart" };

function createInitialState(): State {
  return {
    grid: createInitialGrid(),
    score: 0,
    best: getBestScore(GAME_SLUG),
    status: "playing",
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "restart":
      return { ...createInitialState(), best: state.best };
    case "move": {
      if (state.status === "over") {
        return state;
      }

      const result = move(state.grid, action.direction);
      if (!result.moved) {
        return state;
      }

      const grid = addRandomTile(result.grid);
      const score = state.score + result.scoreGained;
      // Live display only — the SDK persists the real record on game end
      // (see the reportScore effect below), so this reducer stays pure.
      const best = Math.max(state.best, score);

      let status: Status = state.status;
      if (status === "playing" && hasWon(grid)) {
        status = "won";
      }
      if (status === "playing" && !hasMovesAvailable(grid)) {
        status = "over";
      }

      return { grid, score, best, status };
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

export function Game2048() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const [state, dispatch] = useReducer(reducer, initialState);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const { reportScore } = useGameSDK();

  // "won" isn't terminal for 2048 (play continues past the 2048 tile), so
  // only "over" clears the save — clearing on "won" would discard progress
  // a player who keeps playing still wants to resume.
  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "over" ? null : state),
    [state]
  );

  useEffect(() => {
    // Reports the session's score once the game ends (or won). Depends on
    // score too, not just status, in case the score still changes after
    // "won" (2048 allows continuing to play after reaching the win tile).
    // reportScore itself only acts (persists + prompts for a nickname) when
    // this beats the existing local best, so calling it repeatedly is safe.
    if (state.status !== "playing") {
      reportScore(GAME_SLUG, state.score);
    }
    if (state.status === "over") {
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, reportScore]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (phaseRef.current !== "ready") {
        return;
      }
      const direction = DIRECTION_KEYS[event.key];
      if (!direction) {
        return;
      }
      event.preventDefault();
      dispatch({ type: "move", direction });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phaseRef]);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      const start = touchStart.current;
      touchStart.current = null;
      if (phaseRef.current !== "ready") {
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

      dispatch({ type: "move", direction });
    },
    [phaseRef]
  );

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="Score" value={state.score} />
          <ScoreBox label="Best" value={state.best} />
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
        className="relative grid aspect-square w-full max-w-sm touch-none select-none grid-cols-4 gap-3 rounded-xl bg-muted p-3"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {state.grid.flat().map((value, index) => (
          <div
            key={index}
            className="flex items-center justify-center rounded-lg text-lg font-bold transition-colors sm:text-2xl"
            style={tileStyle(value)}
          >
            {value !== 0 ? value : null}
          </div>
        ))}

        {state.status !== "playing" ? (
          <GameOverOverlay
            message={state.status === "won" ? "You Win!" : "Game Over"}
            onRestart={() => dispatch({ type: "restart" })}
          />
        ) : null}

        {phase === "resume-prompt" ? (
          <ResumeDialog
            gameTitle="2048"
            onResume={onResume}
            onNewGame={onNewGame}
          />
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        방향키 또는 스와이프로 타일을 움직여 같은 숫자를 합치세요.
      </p>
    </div>
  );
}

function tileStyle(value: number): CSSProperties {
  if (value === 0) {
    return {};
  }
  const exponent = Math.log2(value);
  const intensity = Math.min(100, exponent * 9);
  return {
    backgroundColor: `color-mix(in oklch, var(--primary) ${intensity}%, var(--muted))`,
    color: intensity > 50 ? "var(--primary-foreground)" : "var(--foreground)",
  };
}
