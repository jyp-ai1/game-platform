"use client";

import {
  clearSave,
  ResumeDialog,
  SaveIndicator,
  useAutoSave,
  useGameSDK,
  useResumableGame,
} from "@game-platform/game-sdk";
import { Button, GameOverOverlay, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useEffect, useReducer } from "react";

import { createInitialState, roll, tickPower, type BowlingState } from "./engine";

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
  const { phase, initialState, phaseRef, onResume, onNewGame } = useResumableGame(GAME_SLUG, createInitialState);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();

  const saveStatus = useAutoSave(GAME_SLUG, () => (state.status === "over" ? null : state), [state]);

  useEffect(() => {
    if (state.status !== "aiming") return;
    const id = setInterval(() => dispatch({ type: "tick" }), TICK_MS);
    return () => clearInterval(id);
  }, [state.status]);

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, reportScore]);

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm justify-between">
        <ScoreBox label="Score" value={state.score} />
        <ScoreBox label="Frame" value={Math.min(state.frame, 5)} />
        <ScoreBox label="Pins" value={state.pins} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <div className="h-4 w-full max-w-sm overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${state.power}%` }} />
      </div>
      <Button
        disabled={state.status !== "aiming" || phaseRef.current !== "ready"}
        onClick={() => dispatch({ type: "roll" })}
      >
        Roll!
      </Button>
      {state.lastKnock > 0 ? <p className="text-sm">+{state.lastKnock} pins!</p> : null}
      {state.status === "over" ? (
        <GameOverOverlay message={`Score ${state.score}`} onRestart={() => dispatch({ type: "restart" })} />
      ) : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Bowling" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
    </div>
  );
}
