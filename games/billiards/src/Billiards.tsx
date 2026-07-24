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
  }, [state.status, state.score, reportScore]);

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm justify-between">
        <ScoreBox label="Score" value={state.score} />
        <ScoreBox label="Shots" value={state.shots} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-xl border-4 border-amber-900 bg-green-800"
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
      </div>
      <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${state.power}%` }} />
      </div>
      <Button
        disabled={state.status !== "aiming" || !canPlayRef.current}
        onClick={() => dispatch({ type: "shoot" })}
      >
        Shoot!
      </Button>
      {state.status === "over" ? (
        <GameOverOverlay
          message={`Score ${state.score}`}
          score={computeScore(state)}
          gameSlug={GAME_SLUG}
          onRetry={() => emitGameRetry(GAME_SLUG)}
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Billiards" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
    </div>
  );
}
