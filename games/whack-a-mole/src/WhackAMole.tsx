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

import { createInitialState, tick, tickIntervalMs, whack, type WhackAMoleState } from "./engine";
import { playGameOverAudio, primeGameAudio, resetGameAudioPrime } from "./game-audio-prime";

const GAME_SLUG = "whack-a-mole";

type Action = { type: "tick" } | { type: "whack"; index: number } | { type: "restart" };

function reducer(state: WhackAMoleState, action: Action): WhackAMoleState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "tick":
      return tick(state);
    case "whack":
      return whack(state, action.index);
    default:
      return state;
  }
}

export function WhackAMoleGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const prevScoreRef = useRef(0);
  const prevStatusRef = useRef(state.status);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);
  
  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      playGameFeel(state.combo >= 3 ? "combo" : "pop", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score, state.combo]);

  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    stageIndex: Math.floor(state.score / 30) + 1,
    fieldRef,
  });
  const saveStatus = useAutoSave(GAME_SLUG, () => (state.status === "over" ? null : state), [state]);

  useEffect(() => {
    if (state.status !== "playing" || !canPlay) return;
    const ms = tickIntervalMs(state.score);
    const id = setInterval(() => dispatch({ type: "tick" }), ms);
    return () => clearInterval(id);
  }, [state.status, canPlay, state.score]);

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
      <div className="flex w-full max-w-sm flex-wrap items-center justify-between gap-2">
        <ScoreBox label="Score" value={state.score} />
        <ScoreBox label="Combo" value={state.combo} />
        <ScoreBox label="Miss" value={state.misses} />
        <ScoreBox label="Time" value={state.timeLeft} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <div ref={fieldRef} className="grid w-full max-w-sm touch-none select-none grid-cols-3 gap-2">
        {Array.from({ length: 9 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              if (!canPlayRef.current) return;
              primeGameAudio();
              playGameFeel("button", fieldRef.current);
              if (state.active === i) {
                playGameFeel(state.combo >= 2 ? "combo" : "pop", fieldRef.current);
              } else {
                playGameFeel("wrong", fieldRef.current);
              }
              dispatch({ type: "whack", index: i });
            }}
            className={cn(
              "aspect-square min-h-11 min-w-11 rounded-xl border-2 border-amber-900/30 bg-amber-100/20 transition-transform duration-150 active:scale-95",
              state.active === i && "scale-110 bg-amber-600 shadow-lg"
            )}
            aria-label={`구멍 ${i + 1}`}
          />
        ))}
      </div>
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

        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Whack-a-Mole" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
    </div>
  );
}
