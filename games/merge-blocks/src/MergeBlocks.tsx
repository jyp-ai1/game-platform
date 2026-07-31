"use client";

import {
  clearSave,
  emitGameRetry,
  feelWithScore,
  PuzzlePlayField,
  playGameFeel,
  ResumeDialog,
  SaveIndicator,
  StandardGameOverOverlay,
  useAutoSave,
  useGameSDK,
  useReadyCountdown,
  useResumableGame,
  standardFeelFromState,
  useStandardGameFeel,
} from "@game-platform/game-sdk";
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";

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
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const prevScoreRef = useRef(0);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...feelWithScore(state as unknown as Record<string, unknown>, state.score),
    fieldRef,
    muteScoreGain: true,
  });

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "over" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status === "over") {
      playGameFeel("wrong", fieldRef.current);
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, reportScore]);

  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      playGameFeel("merge", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

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
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Score" value={state.score} />
        <ScoreBox label="Next" value={state.next} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <PuzzlePlayField fieldRef={fieldRef} bursts={feel.bursts} className="touch-none">
      <div className="grid w-full grid-cols-4 gap-1 rounded-xl bg-muted p-2">
        {state.grid.map((row, ri) =>
          row.map((cell, ci) => (
            <button
              key={`${ri}-${ci}`}
              type="button"
              onClick={() => {
                if (canPlayRef.current && state.status === "playing") {
                  playGameFeel("button", fieldRef.current);
                  dispatch({ type: "drop", col: ci });
                }
              }}
              className={cn(
                "flex aspect-square w-full items-center justify-center rounded text-sm font-bold",
                cell ? "bg-primary/80 text-primary-foreground" : "bg-background/50"
              )}
            >
              {cell || ""}
            </button>
          ))
        )}
      </div>
      </PuzzlePlayField>
      {state.status === "over" ? (
        <StandardGameOverOverlay
          message={`Score ${state.score}`}
          score={state.score}
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
        <ResumeDialog gameTitle="Merge Blocks" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">열을 탭해 블록을 떨어뜨리고 합치세요.</p>
    </div>
  );
}
