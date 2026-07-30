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
import { useEffect, useReducer, useRef } from "react";

import { computeScore, createInitialState, tapTile, type SlidingPuzzleState } from "./engine";

const GAME_SLUG = "sliding-puzzle";

type Action = { type: "tap"; index: number } | { type: "restart" };

function reducer(state: SlidingPuzzleState, action: Action): SlidingPuzzleState {
  if (action.type === "restart") return createInitialState();
  return tapTile(state, action.index);
}

export function SlidingPuzzleGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const score = computeScore(state.moves);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...feelWithScore(state as unknown as Record<string, unknown>, score),
    fieldRef,
  });
  const saveStatus = useAutoSave(GAME_SLUG, () => (state.status === "won" ? null : state), [state]);

  useEffect(() => {
    if (state.status === "won") {
      reportScore(GAME_SLUG, computeScore(state.moves));
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.moves, reportScore]);

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm justify-between">
        <ScoreBox label="Moves" value={state.moves} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <PuzzlePlayField fieldRef={fieldRef} bursts={feel.bursts}>
      <div className="grid w-full grid-cols-4 gap-1 rounded-xl bg-muted p-2">
        {state.tiles.map((tile, i) => (
          <button
            key={i}
            type="button"
            disabled={tile === 0}
            onClick={() => {
              if (canPlayRef.current) {
                playGameFeel("button");
                dispatch({ type: "tap", index: i });
              }
            }}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg text-lg font-bold",
              tile ? "bg-primary text-primary-foreground" : "bg-transparent"
            )}
          >
            {tile || ""}
          </button>
        ))}
      </div>
      </PuzzlePlayField>
      {state.status === "won" ? (
        <StandardGameOverOverlay
          message={`Clear! ${computeScore(state.moves)} pts (${state.moves} moves)`}
          score={score}
          gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={feel.handleExit}
          onRetry={() => emitGameRetry(GAME_SLUG)}
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Sliding Puzzle" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
    </div>
  );
}
