"use client";

import { useGameSDK } from "@game-platform/game-sdk";
import { Button, cn, GameOverOverlay, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useEffect, useReducer, useRef } from "react";

import {
  createInitialState,
  selectColor,
  tick,
  type ColorMatchState,
  type ColorName,
} from "./engine";

const GAME_SLUG = "color-match";
const TICK_MS = 100;

type Action =
  | { type: "select"; color: ColorName }
  | { type: "tick"; dt: number }
  | { type: "restart" };

function reducer(state: ColorMatchState, action: Action): ColorMatchState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "select":
      return selectColor(state, action.color);
    case "tick":
      return tick(state, action.dt);
    default:
      return state;
  }
}

const COLOR_CLASSES: Record<ColorName, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
};

const COLOR_LABELS: Record<ColorName, string> = {
  red: "빨강",
  blue: "파랑",
  green: "초록",
  yellow: "노랑",
  purple: "보라",
  orange: "주황",
};

export function ColorMatchGame() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const { reportScore } = useGameSDK();

  useEffect(() => {
    if (state.status !== "playing") {
      return;
    }
    const id = setInterval(() => {
      dispatch({ type: "tick", dt: TICK_MS / 1000 });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [state.status]);

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, state.score);
    }
  }, [state.status, state.score, reportScore]);

  const progress = Math.max(
    0,
    Math.min(1, state.timeLeftMs / state.roundDurationMs)
  );

  return (
    <div className="flex flex-col items-center gap-4">
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

      <div className="relative flex w-full max-w-sm flex-col items-center gap-4 rounded-xl bg-muted p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Round {state.round}
        </p>

        <div
          className={cn(
            "flex h-24 w-24 items-center justify-center rounded-full shadow-inner",
            COLOR_CLASSES[state.targetColor]
          )}
          aria-label={`목표 색상: ${COLOR_LABELS[state.targetColor]}`}
        />

        <div className="h-2 w-full overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-100 linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
          {state.options.map((color, index) => (
            <button
              key={`${color}-${index}`}
              type="button"
              disabled={state.status !== "playing"}
              onClick={() => dispatch({ type: "select", color })}
              aria-label={COLOR_LABELS[color]}
              className={cn(
                "aspect-square w-full rounded-lg shadow transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-50",
                COLOR_CLASSES[color]
              )}
            />
          ))}
        </div>

        {state.status === "over" ? (
          <GameOverOverlay
            message={`Game Over — Score ${state.score} (Round ${state.round})`}
            onRestart={() => dispatch({ type: "restart" })}
          />
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        위에 표시된 색상과 같은 색을 시간 안에 선택하세요.
      </p>
    </div>
  );
}
