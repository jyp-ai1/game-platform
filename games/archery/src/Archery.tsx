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

import { createInitialState, shoot, type ArcheryState } from "./engine";

const GAME_SLUG = "archery";

type Action = { type: "shoot"; x: number; y: number } | { type: "restart" };

function reducer(state: ArcheryState, action: Action): ArcheryState {
  if (action.type === "restart") return createInitialState();
  return shoot(state, action.x, action.y);
}

export function ArcheryGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } = useResumableGame(GAME_SLUG, createInitialState);
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const saveStatus = useAutoSave(GAME_SLUG, () => (state.status === "over" ? null : state), [state]);

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, reportScore]);

  function onTargetClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!canPlayRef.current || state.status !== "playing") return;
    const rect = e.currentTarget.getBoundingClientRect();
    dispatch({
      type: "shoot",
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm justify-between">
        <ScoreBox label="Score" value={state.score} />
        <ScoreBox label="Arrows" value={state.arrowsLeft} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <button
        type="button"
        onClick={onTargetClick}
        className="relative aspect-square w-full max-w-sm rounded-full border-4 border-amber-600/50 bg-muted"
        aria-label="과녁"
      >
        {[40, 30, 20, 10].map((r) => (
          <span
            key={r}
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-foreground/20"
            style={{ width: `${r * 2}%`, height: `${r * 2}%`, transform: "translate(-50%,-50%)" }}
          />
        ))}
        <span className="pointer-events-none absolute left-1/2 top-1/2 size-[10%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600" />
      </button>
      {state.lastPoints !== null ? <p className="text-sm font-bold">+{state.lastPoints}</p> : null}
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
        <ResumeDialog gameTitle="Archery" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
    </div>
  );
}
