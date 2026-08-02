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
import { Button, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import { createInitialState, shoot, type ArcheryState } from "./engine";
import { playGameOverAudio, primeGameAudio, resetGameAudioPrime } from "./game-audio-prime";

const GAME_SLUG = "archery";

type Action = { type: "shoot"; x: number; y: number } | { type: "restart" };

function reducer(state: ArcheryState, action: Action): ArcheryState {
  if (action.type === "restart") return createInitialState();
  return shoot(state, action.x, action.y);
}

export function ArcheryGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } = useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLButtonElement>(null);
  const prevScoreRef = useRef(0);
  const prevStatusRef = useRef(state.status);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);
  
  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      const gain = state.score - prevScoreRef.current;
      playGameFeel(gain >= 25 ? "combo" : "goal", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    stageIndex: 10 - state.arrowsLeft + 1,
    fieldRef,
  });
  const saveStatus = useAutoSave(GAME_SLUG, () => (state.status === "over" ? null : state), [state]);

  useEffect(() => {
    if (state.status === "over" && prevStatusRef.current !== "over") {
      playGameOverAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, state.score, reportScore]);

  function onTargetClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!canPlayRef.current || state.status !== "playing") return;
    primeGameAudio();
    playGameFeel("button", fieldRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    dispatch({
      type: "shoot",
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

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
        <ScoreBox label="Arrows" value={state.arrowsLeft} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <button
        type="button"
        ref={fieldRef}
        onClick={onTargetClick}
        className="relative aspect-square w-full max-w-sm touch-none select-none rounded-full border-4 border-amber-600/50 bg-muted"
        aria-label="과녁"
      >
        {[40, 30, 20, 10].map((r) => (
          <span
            key={r}
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-foreground/20"
            style={{ width: `${r * 2}%`, height: `${r * 2}%`, transform: "translate(-50%,-50%)" }}
          />
        ))}
        <span className="pointer-events-none absolute left-1/2 top-1/2 size-[10%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600" />
        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}
      </button>
      {state.lastPoints !== null ? <p className="text-sm font-bold">+{state.lastPoints}</p> : null}
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
        <ResumeDialog gameTitle="Archery" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
    </div>
  );
}
