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

import {
  createInitialState,
  nextShot,
  shoot,
  tickPower,
  type BasketballState,
} from "./engine";
import { playGameOverAudio, playStageClearAudio, primeGameAudio, resetGameAudioPrime } from "./game-audio-prime";

const GAME_SLUG = "basketball";
const TICK_MS = 32;
const SWEET_SPOT = 78;

type Action =
  | { type: "tick" }
  | { type: "shoot" }
  | { type: "next" }
  | { type: "restart" };

function reducer(state: BasketballState, action: Action): BasketballState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "tick":
      return tickPower(state);
    case "shoot":
      return shoot(state);
    case "next":
      return nextShot(state);
    default:
      return state;
  }
}

export function BasketballGame() {
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
      const gain = state.score - prevScoreRef.current;
      playGameFeel(gain >= 25 ? "combo" : "explosion", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    stageIndex: state.shot,
    fieldRef,
  });

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "over" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status !== "aiming" || !canPlay) return;
    const id = setInterval(() => dispatch({ type: "tick" }), TICK_MS);
    return () => clearInterval(id);
  }, [state.status, canPlay]);

  useEffect(() => {
    if (state.status !== "result" || !canPlay) return;
    const id = window.setTimeout(() => dispatch({ type: "next" }), 1200);
    return () => window.clearTimeout(id);
  }, [state.status, state.shot, canPlay]);

  useEffect(() => {
    if (state.status === "over" && prevStatusRef.current !== "over") {
      if (state.made >= 7) playStageClearAudio();
      else playGameOverAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status, state.made]);

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
        <ScoreBox label="Round" value={state.shot} />
        <ScoreBox label="Made" value={state.made} />
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={handleRetry}
        >
          <RotateCcw />
        </Button>
      </div>
      <div ref={fieldRef} className="relative h-48 w-full max-w-sm touch-none select-none rounded-xl bg-gradient-to-b from-sky-900/40 to-orange-900/30 p-4">
        <div className="absolute left-1/2 top-4 h-16 w-24 -translate-x-1/2 rounded-b-lg border-4 border-orange-400 bg-transparent" />
        <div
          className="absolute bottom-1 h-1 -translate-x-1/2 rounded bg-green-400/60"
          style={{ left: `${20 + SWEET_SPOT * 0.6}%`, width: "12%" }}
          aria-hidden
        />
        <div
          className="absolute bottom-6 size-8 rounded-full bg-orange-500 transition-all duration-300"
          style={{ left: `${20 + state.power * 0.6}%` }}
        />
        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}
      </div>
      <div className="h-4 w-full max-w-sm overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${state.power}%` }}
        />
      </div>
      {state.status === "aiming" ? (
        <Button
          disabled={!canPlay}
          onClick={() => {
            primeGameAudio();
            playGameFeel("button", fieldRef.current);
            dispatch({ type: "shoot" });
          }}
        >
          Shoot!
        </Button>
      ) : null}
      {state.status === "result" ? (
        <p className="text-sm font-medium">
          {state.lastMade
            ? `Swish! +${state.lastPoints}`
            : "Miss — next round..."}
        </p>
      ) : null}
      {state.status === "over" ? (
        <StandardGameOverOverlay
          message={`Final score ${state.score} (${state.made}/10)`}
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
        <ResumeDialog
          gameTitle="Basketball"
          onResume={onResume}
          onNewGame={handleNewGame}
        />
      ) : null}
      <p className="text-xs text-muted-foreground">그린 존에서 Shoot — 10라운드 슛.</p>
    </div>
  );
}
