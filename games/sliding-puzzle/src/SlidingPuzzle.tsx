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
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const saveStatus = useAutoSave(GAME_SLUG, () => (state.status === "won" ? null : state), [state]);

  useEffect(() => {
    if (state.status === "won") {
      reportScore(GAME_SLUG, computeScore(state.moves));
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.moves, reportScore]);

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm justify-between">
        <ScoreBox label="Moves" value={state.moves} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <div className="grid w-full max-w-sm grid-cols-4 gap-1 rounded-xl bg-muted p-2">
        {state.tiles.map((tile, i) => (
          <button
            key={i}
            type="button"
            disabled={tile === 0}
            onClick={() => {
              if (canPlayRef.current) dispatch({ type: "tap", index: i });
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
      {state.status === "won" ? (
        <GameOverOverlay
          message={`Clear! ${computeScore(state.moves)} pts (${state.moves} moves)`}
          score={computeScore(state.moves)}
          gameSlug={GAME_SLUG}
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
