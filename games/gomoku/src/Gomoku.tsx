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
import { Button, cn, GameOverOverlay, ReadyCountdown } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useEffect, useReducer } from "react";

import { computeScore, cpuMove, createInitialState, placeStone, type GomokuState } from "./engine";

const GAME_SLUG = "gomoku";

type Action = { type: "place"; row: number; col: number } | { type: "cpu" } | { type: "restart" };

function reducer(state: GomokuState, action: Action): GomokuState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "place":
      return placeStone(state, action.row, action.col);
    case "cpu":
      return cpuMove(state);
    default:
      return state;
  }
}

export function GomokuGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const humanTurn =
    canPlayRef.current && state.current === 1 && state.winner === null;

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.winner !== null ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.winner !== null || state.current !== 2) return;
    const id = setTimeout(() => dispatch({ type: "cpu" }), 400);
    return () => clearTimeout(id);
  }, [state.current, state.winner, state.board]);

  useEffect(() => {
    if (state.winner === 1) {
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
    }
  }, [state.winner, reportScore]);

  const msg = state.winner === 1 ? "You Win!" : state.winner === 2 ? "CPU Wins!" : humanTurn ? "돌을 놓으세요 (5목)" : "CPU...";

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <p className="text-sm text-muted-foreground">{msg}</p>
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <div className="grid w-full max-w-sm grid-cols-9 gap-px rounded bg-amber-900/40 p-1">
        {state.board.map((row, ri) =>
          row.map((cell, ci) => {
            const win = state.winningCells.some(([r, c]) => r === ri && c === ci);
            return (
              <button
                key={`${ri}-${ci}`}
                type="button"
                disabled={!humanTurn || cell !== 0}
                onClick={() => dispatch({ type: "place", row: ri, col: ci })}
                className={cn(
                  "aspect-square rounded-sm bg-amber-100/20",
                  cell === 1 && "bg-neutral-900",
                  cell === 2 && "bg-neutral-100",
                  win && "ring-2 ring-amber-400"
                )}
              />
            );
          })
        )}
      </div>
      {state.winner !== null ? (
        <GameOverOverlay
          message={msg}
          score={computeScore(state)}
          gameSlug={GAME_SLUG}
          onRetry={() => emitGameRetry(GAME_SLUG)}
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Gomoku" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
    </div>
  );
}
