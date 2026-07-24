"use client";

import {
  clearSave,
  ResumeDialog,
  SaveIndicator,
  useAutoSave,
  useGameSDK,
  emitGameRetry,
  useReadyCountdown,
  useResumableGame,
} from "@game-platform/game-sdk";
import { Button, GameOverOverlay, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useEffect, useReducer } from "react";

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

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "over" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status !== "aiming") return;
    const id = setInterval(() => dispatch({ type: "tick" }), TICK_MS);
    return () => clearInterval(id);
  }, [state.status]);

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.strokes, reportScore]);

  const inHole =
    Math.hypot(state.ballX - state.holeX, state.ballY - state.holeY) <=
    HOLE_R + BALL_R;

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm justify-between">
        <ScoreBox label="Strokes" value={state.strokes} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <div
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-green-800/50 bg-green-900/40"
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
      </div>
      <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${state.power}%` }} />
      </div>
      <Button
        disabled={state.status !== "aiming" || !canPlayRef.current}
        onClick={() => dispatch({ type: "putt" })}
      >
        Putt!
      </Button>
      {state.status === "over" ? (
        <GameOverOverlay
          message={inHole ? `Hole in ${state.strokes}!` : `${state.strokes} strokes`}
          score={computeScore(state)}
          gameSlug={GAME_SLUG}
          onRetry={() => emitGameRetry(GAME_SLUG)}
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Mini Golf" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
    </div>
  );
}
