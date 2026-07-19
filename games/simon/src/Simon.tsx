"use client";

import { useGameSDK } from "@game-platform/game-sdk";
import { Button, cn, GameOverOverlay, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useEffect, useReducer } from "react";

import {
  advancePlayback,
  createInitialState,
  startRound,
  submitInput,
  type SimonColor,
  type SimonState,
} from "./engine";

const GAME_SLUG = "simon";
const PLAYBACK_STEP_MS = 600;
const ROUND_START_DELAY_MS = 700;
const NEXT_ROUND_DELAY_MS = 900;

const PADS: { color: SimonColor; label: string; className: string; activeClassName: string }[] = [
  { color: "red", label: "빨강", className: "bg-red-500/60", activeClassName: "bg-red-500" },
  { color: "blue", label: "파랑", className: "bg-blue-500/60", activeClassName: "bg-blue-500" },
  { color: "green", label: "초록", className: "bg-green-500/60", activeClassName: "bg-green-500" },
  { color: "yellow", label: "노랑", className: "bg-yellow-400/60", activeClassName: "bg-yellow-400" },
];

type Action =
  | { type: "startRound" }
  | { type: "advancePlayback" }
  | { type: "submitInput"; color: SimonColor }
  | { type: "restart" };

function reducer(state: SimonState, action: Action): SimonState {
  switch (action.type) {
    case "startRound":
      return startRound(state);
    case "advancePlayback":
      return advancePlayback(state);
    case "submitInput":
      return submitInput(state, action.color);
    case "restart":
      return createInitialState();
    default:
      return state;
  }
}

export function SimonGame() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const { reportScore } = useGameSDK();

  // Very first mount (and immediately after a restart): kick off round 1
  // after a brief pause.
  useEffect(() => {
    if (state.phase !== "idle" || state.round !== 0) {
      return;
    }
    const timeout = setTimeout(() => {
      dispatch({ type: "startRound" });
    }, ROUND_START_DELAY_MS);
    return () => clearTimeout(timeout);
    // Only re-run when we transition back into the "very first" idle state,
    // i.e. right after a restart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.round]);

  // A round was just completed successfully (idle with round > 0): advance
  // to the next round after a short pause.
  useEffect(() => {
    if (state.phase !== "idle" || state.round === 0) {
      return;
    }
    const timeout = setTimeout(() => {
      dispatch({ type: "startRound" });
    }, NEXT_ROUND_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [state.phase, state.round]);

  // Drive playback: while showing the sequence, tick through it on an
  // interval owned entirely by this effect.
  useEffect(() => {
    if (state.phase !== "playback") {
      return;
    }
    const interval = setInterval(() => {
      dispatch({ type: "advancePlayback" });
    }, PLAYBACK_STEP_MS);
    return () => clearInterval(interval);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase === "over") {
      reportScore(GAME_SLUG, state.score);
    }
  }, [state.phase, state.score, reportScore]);

  const highlightedColor =
    state.phase === "playback" ? state.sequence[state.playbackIndex] : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="Round" value={state.round} />
          <ScoreBox label="Score" value={state.score} />
          <ScoreBox label="Best" value={state.bestRound} />
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

      <div className="relative grid w-full max-w-sm grid-cols-2 gap-2">
        {PADS.map((pad) => {
          const isActive = highlightedColor === pad.color;
          const disabled = state.phase !== "input";
          return (
            <button
              key={pad.color}
              type="button"
              aria-label={pad.label}
              disabled={disabled}
              onClick={() => dispatch({ type: "submitInput", color: pad.color })}
              className={cn(
                "aspect-square rounded-xl transition-transform",
                isActive ? pad.activeClassName : pad.className,
                isActive ? "scale-95" : "scale-100",
                disabled ? "cursor-not-allowed" : "cursor-pointer"
              )}
            />
          );
        })}

        {state.phase === "over" ? (
          <GameOverOverlay
            message={`Game Over — Round ${state.round}`}
            onRestart={() => dispatch({ type: "restart" })}
          />
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        점점 길어지는 색상 순서를 기억했다가 그대로 따라 눌러보세요.
      </p>
    </div>
  );
}
