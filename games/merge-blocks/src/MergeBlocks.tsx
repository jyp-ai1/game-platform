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

import { createInitialState, dropColumn, type MergeBlocksState } from "./engine";

const GAME_SLUG = "merge-blocks";

type Action = { type: "drop"; col: number } | { type: "restart" };

function reducer(state: MergeBlocksState, action: Action): MergeBlocksState {
  if (action.type === "restart") return createInitialState();
  return dropColumn(state, action.col);
}

export function MergeBlocksGame() {
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
    if (state.status === "over") {
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, reportScore]);

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Score" value={state.score} />
        <ScoreBox label="Next" value={state.next} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-2">
        {state.grid.map((row, ri) =>
          row.map((cell, ci) => (
            <button
              key={`${ri}-${ci}`}
              type="button"
              onClick={() => {
                if (canPlayRef.current && state.status === "playing") {
                  dispatch({ type: "drop", col: ci });
                }
              }}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded text-sm font-bold",
                cell ? "bg-primary/80 text-primary-foreground" : "bg-background/50"
              )}
            >
              {cell || ""}
            </button>
          ))
        )}
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
        <ResumeDialog gameTitle="Merge Blocks" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">열을 탭해 블록을 떨어뜨리고 합치세요.</p>
    </div>
  );
}
