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

import { createInitialState, placeBlock, tick, type StackTowerState } from "./engine";

const GAME_SLUG = "stack-tower";
const TICK_MS = 32;

type Action = { type: "tick" } | { type: "place" } | { type: "restart" };

function reducer(state: StackTowerState, action: Action): StackTowerState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "tick":
      return tick(state);
    case "place":
      return placeBlock(state);
    default:
      return state;
  }
}

export function StackTowerGame() {
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
    if (state.status !== "playing") return;
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
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Height" value={state.stack.length} />
        <ScoreBox label="Score" value={state.score} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <button
        type="button"
        className="relative h-72 w-full max-w-sm overflow-hidden rounded-xl bg-muted"
        onClick={() => {
          if (canPlayRef.current && state.status === "playing") {
            dispatch({ type: "place" });
          }
        }}
        aria-label="탭하여 블록 쌓기"
      >
        {state.stack.map((b, i) => (
          <div
            key={i}
            className="absolute bottom-0 h-4 bg-primary"
            style={{
              left: `${b.x}%`,
              width: `${b.width}%`,
              bottom: `${i * 16}px`,
              opacity: 0.5 + (i / state.stack.length) * 0.5,
            }}
          />
        ))}
        {state.status === "playing" ? (
          <div
            className="absolute h-4 bg-accent"
            style={{
              left: `${state.current.x}%`,
              width: `${state.current.width}%`,
              bottom: `${state.stack.length * 16}px`,
            }}
          />
        ) : null}
      </button>
      {state.status === "over" ? (
        <GameOverOverlay
          message={`${state.stack.length} blocks!`}
          score={state.score}
          gameSlug={GAME_SLUG}
          onRetry={() => emitGameRetry(GAME_SLUG)}
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Stack Tower" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">움직이는 블록을 탭해서 쌓으세요.</p>
    </div>
  );
}
