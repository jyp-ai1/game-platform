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
  BILLIARDS_H,
  BILLIARDS_W,
  computeScore,
  createInitialState,
  shoot,
  tickAim,
  type BilliardsState,
} from "./engine";

const GAME_SLUG = "billiards";
const TICK_MS = 32;

type Action = { type: "tick" } | { type: "shoot" } | { type: "restart" };

function reducer(state: BilliardsState, action: Action): BilliardsState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "tick":
      return tickAim(state);
    case "shoot":
      return shoot(state);
    default:
      return state;
  }
}

export function BilliardsGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const prevScoreRef = useRef(0);
  
  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      const gain = state.score - prevScoreRef.current;
      playGameFeel(gain >= 25 ? "combo" : "explosion", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
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
    if (state.status === "over") {
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, reportScore]);


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
      <div className="flex w-full max-w-sm justify-between">
        <ScoreBox label="Score" value={state.score} />
        <ScoreBox label="Shots" value={state.shots} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <div
        className="relative w-full max-w-sm touch-none select-none overflow-hidden rounded-xl border-4 border-amber-900 bg-green-800"
        ref={fieldRef}
        style={{ aspectRatio: `${BILLIARDS_W}/${BILLIARDS_H}` }}
      >
        {state.balls
          .filter((b) => !b.pocketed)
          .map((b) => (
            <div
              key={b.id}
              className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40"
              style={{ left: `${b.x}%`, top: `${b.y}%`, backgroundColor: b.color }}
            />
          ))}
        <div
          className="absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
          style={{ left: `${state.cueX}%`, top: `${state.cueY}%` }}
        />
        {state.status === "aiming" ? (
          <div
            className="absolute h-0.5 origin-left bg-white/70"
            style={{
              left: `${state.cueX}%`,
              top: `${state.cueY}%`,
              width: `${state.power * 0.5}%`,
              transform: `rotate(${state.angle}deg)`,
            }}
          />
        ) : null}
        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}
      </div>
      <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${state.power}%` }} />
      </div>
      <Button
        disabled={state.status !== "aiming" || !canPlay}
        onClick={() => {
          playGameFeel("button", fieldRef.current);
          dispatch({ type: "shoot" });
        }}
      >
        Shoot!
      </Button>
      {state.status === "over" ? (
        <StandardGameOverOverlay
          message={`Score ${state.score}`}
          score={computeScore(state)}
          gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={feel.handleExit}
          onRetry={handleRetry}
          onRestart={handleRetry}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Billiards" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
    </div>
  );
}
