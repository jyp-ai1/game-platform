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
  nextRound,
  slide,
  tickPower,
  type ShuffleboardState,
} from "./engine";
import { playGameOverAudio, playStageClearAudio, primeGameAudio, resetGameAudioPrime } from "./game-audio-prime";

const GAME_SLUG = "shuffleboard";
const TICK_MS = 32;

type Action =
  | { type: "tick" }
  | { type: "slide" }
  | { type: "next" }
  | { type: "restart" };

function reducer(state: ShuffleboardState, action: Action): ShuffleboardState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "tick":
      return tickPower(state);
    case "slide":
      return slide(state);
    case "next":
      return nextRound(state);
    default:
      return state;
  }
}

export function ShuffleboardGame() {
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
      playGameFeel(gain >= 25 ? "combo" : "goal", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    stageIndex: state.round,
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
  }, [state.status, state.round, canPlay]);

  useEffect(() => {
    if (state.status === "over" && prevStatusRef.current !== "over") {
      if (state.score >= 20) playStageClearAudio();
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
        <ScoreBox label="Round" value={state.round} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <div ref={fieldRef} className="relative h-20 w-full max-w-sm touch-none select-none overflow-hidden rounded-xl border border-border">
        <div className="absolute inset-y-0 left-[30%] w-0.5 bg-muted-foreground/30" />
        <div className="absolute inset-y-0 left-[52%] w-0.5 bg-muted-foreground/30" />
        <div className="absolute inset-y-0 left-[72%] w-0.5 bg-muted-foreground/30" />
        <div className="absolute inset-y-0 left-[88%] w-0.5 bg-amber-400/60" />
        <div
          className="absolute top-1/2 size-10 -translate-y-1/2 rounded-full bg-sky-500 shadow-md transition-all duration-500"
          style={{ left: `${state.discX}%` }}
        />
        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}
      </div>
      <div className="flex w-full max-w-sm justify-between text-xs text-muted-foreground">
        <span>0</span><span>1pt</span><span>2pt</span><span>3pt</span><span>4pt</span>
      </div>
      <div className="h-4 w-full max-w-sm overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${state.power}%` }} />
      </div>
      {state.status === "aiming" ? (
        <Button disabled={!canPlay} onClick={() => {
          primeGameAudio();
          playGameFeel("button", fieldRef.current);
          dispatch({ type: "slide" });
        }}>
          Slide!
        </Button>
      ) : null}
      {state.status === "result" ? (
        <p className="text-sm">Zone score: +{state.lastPoints}</p>
      ) : null}
      {state.status === "over" ? (
        <StandardGameOverOverlay
          message={`Total ${state.score} points`}
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
        <ResumeDialog gameTitle="Shuffleboard" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">파워를 맞춰 8라운드 셔플보드.</p>
    </div>
  );
}
