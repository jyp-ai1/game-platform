"use client";

import {
  clearSave,
  emitGameRetry,
  ResumeDialog,
  SaveIndicator,
  StandardGameOverOverlay,
  useAutoSave,
  useGameSDK,
  useReadyCountdown,
  useResumableGame,
  standardFeelFromState,
  useStandardGameFeel,
  playGameFeel,
  GameFeelLayer,
} from "@game-platform/game-sdk";
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";

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
  const fieldRef = useRef<HTMLDivElement>(null);
  const prevScoreRef = useRef(0);
  
  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      playGameFeel("combo", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

  useEffect(() => {
    if (state.phase === "over") {
      playGameFeel("wrong", fieldRef.current);
    }
  }, [state.phase]);

  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState({
      ...(state as unknown as Record<string, unknown>),
      status: state.phase === "over" ? "over" : "playing",
      round: state.round,
    }),
    stageIndex: state.round,
    fieldRef,
  });
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);


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
    const playbackMs = Math.max(280, PLAYBACK_STEP_MS - state.round * 28);
    const interval = setInterval(() => {
      if (canPlayRef.current) {
        dispatch({ type: "advancePlayback" });
      }
    }, playbackMs);
    return () => clearInterval(interval);
  }, [state.phase, state.round, canPlay]);

  useEffect(() => {
    if (state.phase === "over") {
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
    }
  }, [state.phase, state.score, reportScore]);

  const highlightedColor =
    state.phase === "playback" ? state.sequence[state.playbackIndex] : null;

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    prevScoreRef.current = 0;
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    prevScoreRef.current = 0;
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
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
          onClick={handleRetry}
        >
          <RotateCcw />
        </Button>
      </div>

      <div ref={fieldRef} className="relative grid w-full max-w-sm touch-none select-none grid-cols-2 gap-2">
        {PADS.map((pad) => {
          const isActive = highlightedColor === pad.color;
          const disabled = !canPlay || state.phase !== "input";
          return (
            <button
              key={pad.color}
              type="button"
              aria-label={pad.label}
              disabled={disabled}
              onClick={() => {
                playGameFeel("button", fieldRef.current);
                dispatch({ type: "submitInput", color: pad.color });
              }}
              className={cn(
                "aspect-square min-h-11 min-w-11 rounded-xl transition-transform duration-150 active:scale-95",
                isActive ? pad.activeClassName : pad.className,
                isActive ? "scale-95" : "scale-100",
                disabled ? "cursor-not-allowed" : "cursor-pointer"
              )}
            />
          );
        })}

        {state.phase === "over" ? (
          <StandardGameOverOverlay
            message={`Game Over — Round ${state.round}`}
            score={state.score}
            gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={feel.handleExit}
            onRetry={handleRetry}
            onRestart={handleRetry}
          />
        ) : null}
        {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}

        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}
      </div>

      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Simon" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}

      <p className="text-xs text-muted-foreground">
        점점 길어지는 색상 순서를 기억했다가 그대로 따라 눌러보세요.
      </p>
    </div>
  );
}
