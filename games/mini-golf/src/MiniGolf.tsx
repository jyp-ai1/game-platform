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
  BALL_R,
  computeScore,
  createInitialState,
  HOLE_R,
  MINI_GOLF_H,
  MINI_GOLF_W,
  putt,
  tickAim,
  type MiniGolfState,
} from "./engine";

const GAME_SLUG = "mini-golf";
const TICK_MS = 32;

type Action = { type: "tick" } | { type: "putt" } | { type: "restart" };

function reducer(state: MiniGolfState, action: Action): MiniGolfState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "tick":
      return tickAim(state);
    case "putt":
      return putt(state);
    default:
      return state;
  }
}

export function MiniGolfGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const prevScoreRef = useRef(0);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

  useEffect(() => {
    const score = computeScore(state);
    if (score > prevScoreRef.current) {
      playGameFeel("goal", fieldRef.current);
    }
    prevScoreRef.current = score;
  }, [state.strokes, state.status]);

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
  }, [state.status, state.strokes, reportScore]);

  const inHole =
    Math.hypot(state.ballX - state.holeX, state.ballY - state.holeY) <=
    HOLE_R + BALL_R;


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
        <ScoreBox label="Strokes" value={state.strokes} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <div
        className="relative w-full max-w-sm touch-none select-none overflow-hidden rounded-xl border border-green-800/50 bg-green-900/40"
        ref={fieldRef}
        style={{ aspectRatio: `${MINI_GOLF_W}/${MINI_GOLF_H}` }}
      >
        <div
          className="absolute rounded-full border-2 border-white/30 bg-background"
          style={{
            left: `${state.holeX - HOLE_R}%`,
            top: `${state.holeY - HOLE_R}%`,
            width: `${HOLE_R * 2}%`,
            height: `${HOLE_R * 2}%`,
          }}
        />
        <div
          className="absolute rounded-full bg-white shadow"
          style={{
            left: `${state.ballX - BALL_R}%`,
            top: `${state.ballY - BALL_R}%`,
            width: `${BALL_R * 2}%`,
            height: `${BALL_R * 2}%`,
          }}
        />
        {state.status === "aiming" ? (
          <div
            className="absolute h-0.5 origin-left bg-white/60"
            style={{
              left: `${state.ballX}%`,
              top: `${state.ballY}%`,
              width: `${state.power * 0.4}%`,
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
          dispatch({ type: "putt" });
        }}
      >
        Putt!
      </Button>
      {state.status === "over" ? (
        <StandardGameOverOverlay
          message={inHole ? `Hole in ${state.strokes}!` : `${state.strokes} strokes`}
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
        <ResumeDialog gameTitle="Mini Golf" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
    </div>
  );
}
