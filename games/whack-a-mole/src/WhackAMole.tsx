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
import { Button, cn, GameOverOverlay, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useEffect, useReducer } from "react";

import { createInitialState, tick, whack, type WhackAMoleState } from "./engine";

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
  const saveStatus = useAutoSave(GAME_SLUG, () => (state.status === "over" ? null : state), [state]);

  useEffect(() => {
    if (state.status !== "playing") return;
    const id = setInterval(() => dispatch({ type: "tick" }), 1000);
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
        <ScoreBox label="Time" value={state.timeLeft} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <div className="grid w-full max-w-sm grid-cols-3 gap-2">
        {Array.from({ length: 9 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              if (canPlayRef.current) dispatch({ type: "whack", index: i });
            }}
            className={cn(
              "aspect-square rounded-xl border-2 border-amber-900/30 bg-amber-100/20",
              state.active === i && "bg-amber-600 scale-105"
            )}
            aria-label={`구멍 ${i + 1}`}
          />
        ))}
      </div>
      {state.status === "over" ? (
        <GameOverOverlay
          message={`Score ${state.score}`}
          score={state.score}
          gameSlug={GAME_SLUG}
          onRetry={() => emitGameRetry(GAME_SLUG)}
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Whack-a-Mole" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
    </div>
  );
}
