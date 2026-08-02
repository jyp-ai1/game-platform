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

import { createInitialState, MAX_FRAMES, roll, tickPower, type BowlingState } from "./engine";
import { playGameOverAudio, playStageClearAudio, primeGameAudio, resetGameAudioPrime } from "./game-audio-prime";

const GAME_SLUG = "bowling";
const TICK_MS = 32;

type Action = { type: "tick" } | { type: "roll" } | { type: "restart" };

function reducer(state: BowlingState, action: Action): BowlingState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "tick":
      return tickPower(state);
    case "roll":
      return roll(state);
    default:
      return state;
  }
}

export function BowlingGame() {
  const { phase, initialState, onResume, onNewGame } = useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const prevScoreRef = useRef(0);
  const prevStatusRef = useRef(state.status);

  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      const gain = state.score - prevScoreRef.current;
      playGameFeel(gain >= 100 ? "combo" : state.lastKnock >= 10 ? "goal" : "explosion", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score, state.lastKnock]);

  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    stageIndex: state.frame,
    fieldRef,
  });

  const saveStatus = useAutoSave(GAME_SLUG, () => (state.status === "over" ? null : state), [state]);

  useEffect(() => {
    if (state.status !== "aiming" || !canPlay) return;
    const id = setInterval(() => dispatch({ type: "tick" }), TICK_MS);
    return () => clearInterval(id);
  }, [state.status, canPlay]);

  useEffect(() => {
    if (state.status === "over" && prevStatusRef.current !== "over") {
      if (state.score >= 200) playStageClearAudio();
      else playGameOverAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status, state.score]);

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, state.score, reportScore]);

  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    resetGameAudioPrime();
    prevScoreRef.current = 0;
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    resetGameAudioPrime();
    prevScoreRef.current = 0;
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm justify-between">
        <ScoreBox label="Score" value={state.score} />
        <ScoreBox label="Frame" value={Math.min(state.frame, MAX_FRAMES)} />
        <ScoreBox label="Pins" value={state.pins} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <div
        ref={fieldRef}
        className="relative h-40 w-full max-w-sm touch-none select-none overflow-hidden rounded-xl bg-gradient-to-b from-amber-950/30 to-amber-900/20 p-4"
      >
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          {[
            [0, 0], [1, 0], [2, 0], [3, 0],
            [0.5, 1], [1.5, 2.5], [2.5, 1],
            [1, 2], [2, 2],
            [1.5, 3],
          ].map((coords, i) => {
            const col = coords[0] ?? 0;
            const row = coords[1] ?? 0;
            const standing = i < state.pins;
            return (
              <div
                key={i}
                className={cn(
                  "absolute size-5 rounded-full border border-white/30 sm:size-6",
                  standing ? "bg-white shadow-md" : "opacity-0 scale-50"
                )}
                style={{
                  left: `${col * 28}px`,
                  bottom: `${row * 24}px`,
                  transition: "all 0.3s ease",
                }}
              />
            );
          })}
        </div>
        <div className="absolute bottom-0 left-1/2 h-3 w-16 -translate-x-1/2 rounded-t bg-amber-800/60" />
        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}
      </div>
      <div className="h-4 w-full max-w-sm overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${state.power}%` }} />
      </div>
      <Button
        disabled={state.status !== "aiming" || !canPlay}
        onClick={() => {
          primeGameAudio();
          playGameFeel("button", fieldRef.current);
          dispatch({ type: "roll" });
        }}
      >
        Roll!
      </Button>
      {state.lastKnock > 0 ? (
        <p className="text-sm font-medium">
          {state.lastKnock >= 10 ? "STRIKE!" : `+${state.lastKnock} pins`}
        </p>
      ) : null}
      {state.status === "over" ? (
        <StandardGameOverOverlay
          message={`Score ${state.score}`}
          score={state.score}
          gameSlug={GAME_SLUG}
          isNewBest={feel.isNewBest}
          bestRecordDelta={feel.bestRecordDelta}
          onExit={handleExit}
          onRetry={handleRetry}
          onRestart={handleRetry}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Bowling" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">파워를 맞춰 10프레임 볼링.</p>
    </div>
  );
}
