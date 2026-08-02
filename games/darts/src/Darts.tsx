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

import { createInitialState, throwDart, type DartsState } from "./engine";
import { playGameOverAudio, playStageClearAudio, primeGameAudio, resetGameAudioPrime } from "./game-audio-prime";

const GAME_SLUG = "darts";

type Action =
  | { type: "throw"; xPct: number; yPct: number }
  | { type: "restart" };

function reducer(state: DartsState, action: Action): DartsState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "throw":
      return throwDart(state, action.xPct, action.yPct);
    default:
      return state;
  }
}

export function DartsGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLButtonElement>(null);
  const prevStatusRef = useRef(state.status);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);
  
  useEffect(() => {
    if (state.lastPoints !== null && state.lastPoints > 0) {
      playGameFeel(state.lastPoints >= 25 ? "combo" : "goal", fieldRef.current);
    }
  }, [state.lastPoints]);

  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    stageIndex: 10 - state.throwsLeft + 1,
    fieldRef,
  });

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "over" ? null : state),
    [state]
  );

  useEffect(() => {
    if (
      (state.status === "over" || state.status === "won") &&
      prevStatusRef.current === "playing"
    ) {
      if (state.status === "won") playStageClearAudio();
      else playGameOverAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    if (state.status === "won" || state.status === "over") {
      reportScore(
        GAME_SLUG,
        state.status === "won" ? 501 : 501 - state.scoreRemaining
      );
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, state.scoreRemaining, reportScore]);

  function handleBoardClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!canPlayRef.current || state.status !== "playing") return;
    primeGameAudio();
    playGameFeel("button", fieldRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    dispatch({ type: "throw", xPct, yPct });
  }

  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    resetGameAudioPrime();
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    resetGameAudioPrime();
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="Remaining" value={state.scoreRemaining} />
          <ScoreBox label="Throws" value={state.throwsLeft} />
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
      <button
        type="button"
        ref={fieldRef}
        onClick={handleBoardClick}
        disabled={state.status !== "playing" || !canPlay}
        aria-label="다트판 — 클릭하여 던지기"
        className="relative aspect-square w-full max-w-sm touch-none select-none rounded-full border-4 border-primary/30 bg-muted"
      >
        {[48, 42, 32, 22, 12, 6].map((r, i) => (
          <span
            key={r}
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-foreground/20"
            style={{
              width: `${r * 2}%`,
              height: `${r * 2}%`,
              transform: "translate(-50%, -50%)",
              opacity: 0.15 + i * 0.05,
            }}
          />
        ))}
        <span className="pointer-events-none absolute left-1/2 top-1/2 size-[8%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive" />
        {state.lastPoints !== null ? (
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-sm font-bold text-primary">
            +{state.lastPoints}
          </span>
        ) : null}
        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}
      </button>
      {state.status === "won" || state.status === "over" ? (
        <StandardGameOverOverlay
          message={
            state.status === "won"
              ? "501 Checkout!"
              : `${state.scoreRemaining} left — out of throws`
          }
          score={state.status === "won" ? 501 : 501 - state.scoreRemaining}
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
        <ResumeDialog gameTitle="Darts" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">501에서 시작 — 정확히 0이 되면 승리.</p>
    </div>
  );
}
