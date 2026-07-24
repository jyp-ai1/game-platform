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
import { Button, cn, GameOverOverlay, ReadyCountdown, ScoreBox } from "@game-platform/ui";
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
  const { phase, initialState, onResume, onNewGame } = useResumableGame(
    GAME_SLUG,
    createInitialState
  );
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.phase !== "over" ? state : null),
    [state]
  );

  useEffect(() => {
    if (!canPlayRef.current || state.phase !== "idle" || state.round !== 0) {
      return;
    }
    const timeout = setTimeout(() => {
      dispatch({ type: "startRound" });
    }, ROUND_START_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [state.phase, state.round, canPlay]);

  useEffect(() => {
    if (!canPlayRef.current || state.phase !== "idle" || state.round === 0) {
      return;
    }
    const timeout = setTimeout(() => {
      dispatch({ type: "startRound" });
    }, NEXT_ROUND_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [state.phase, state.round, canPlay]);

  useEffect(() => {
    if (!canPlayRef.current || state.phase !== "playback") {
      return;
    }
    const interval = setInterval(() => {
      if (canPlayRef.current) {
        dispatch({ type: "advancePlayback" });
      }
    }, PLAYBACK_STEP_MS);
    return () => clearInterval(interval);
  }, [state.phase, canPlay]);

  useEffect(() => {
    if (state.phase === "over") {
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
    }
  }, [state.phase, state.score, reportScore]);

  const highlightedColor =
    state.phase === "playback" ? state.sequence[state.playbackIndex] : null;

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
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
          const disabled = !canPlay || state.phase !== "input";
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
            score={state.score}
            gameSlug={GAME_SLUG}
            onRetry={() => emitGameRetry(GAME_SLUG)}
            onRestart={() => dispatch({ type: "restart" })}
          />
        ) : null}
        {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      </div>

      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Simon" onResume={onResume} onNewGame={onNewGame} />
      ) : null}

      <p className="text-xs text-muted-foreground">
        점점 길어지는 색상 순서를 기억했다가 그대로 따라 눌러보세요.
      </p>
    </div>
  );
}
