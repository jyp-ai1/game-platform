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
  createInitialState,
  nextShot,
  shoot,
  tickPower,
  type BasketballState,
} from "./engine";

const GAME_SLUG = "basketball";
const TICK_MS = 32;

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
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, reportScore]);

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm justify-between">
        <ScoreBox label="Score" value={state.score} />
        <ScoreBox label="Shot" value={state.shot} />
        <ScoreBox label="Made" value={state.made} />
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={() => dispatch({ type: "restart" })}
        >
          <RotateCcw />
        </Button>
      </div>
      <div className="relative h-48 w-full max-w-sm rounded-xl bg-gradient-to-b from-sky-900/40 to-orange-900/30 p-4">
        <div className="absolute left-1/2 top-4 h-16 w-24 -translate-x-1/2 rounded-b-lg border-4 border-orange-400 bg-transparent" />
        <div
          className="absolute bottom-6 size-8 rounded-full bg-orange-500 transition-all duration-300"
          style={{ left: `${20 + state.power * 0.6}%` }}
        />
      </div>
      <div className="h-4 w-full max-w-sm overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${state.power}%` }}
        />
      </div>
      {state.status === "aiming" ? (
        <Button
          disabled={!canPlayRef.current}
          onClick={() => dispatch({ type: "shoot" })}
        >
          Shoot!
        </Button>
      ) : null}
      {state.status === "result" ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium">
            {state.lastMade
              ? `Swish! +${state.lastPoints}`
              : "Miss — try again"}
          </p>
          <Button onClick={() => dispatch({ type: "next" })}>Next shot</Button>
        </div>
      ) : null}
      {state.status === "over" ? (
        <GameOverOverlay
          message={`Final score ${state.score} (${state.made}/10)`}
          score={state.score}
          gameSlug={GAME_SLUG}
          onRetry={() => emitGameRetry(GAME_SLUG)}
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog
          gameTitle="Basketball"
          onResume={onResume}
          onNewGame={onNewGame}
        />
      ) : null}
    </div>
  );
}
