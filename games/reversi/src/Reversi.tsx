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

import {
  computeScore,
  cpuMove,
  createInitialState,
  placeDisc,
  validMoves,
  type ReversiState,
} from "./engine";

const GAME_SLUG = "reversi";

type Action = { type: "place"; row: number; col: number } | { type: "cpu" } | { type: "restart" };

function reducer(state: ReversiState, action: Action): ReversiState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "place":
      return placeDisc(state, action.row, action.col);
    case "cpu":
      return cpuMove(state);
    default:
      return state;
  }
}

export function ReversiGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const humanMoves = validMoves(state.board, 1);
  const humanTurn =
    canPlayRef.current && state.current === 1 && state.winner === null;

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.winner !== null ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.winner !== null || state.current !== 2) return;
    const id = setTimeout(() => dispatch({ type: "cpu" }), 500);
    return () => clearTimeout(id);
  }, [state.current, state.winner, state.board]);

  useEffect(() => {
    if (state.winner !== null) {
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
    }
  }, [state.winner, reportScore]);

  const msg =
    state.winner === 1 ? "You Win!" : state.winner === 2 ? "CPU Wins!" : state.winner === "draw" ? "Draw" : humanTurn ? "흑(당신) 차례" : "CPU 차례...";

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{msg}</p>
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <div className="grid w-full max-w-sm grid-cols-8 gap-0.5 rounded-xl bg-green-800/40 p-1">
        {state.board.map((row, ri) =>
          row.map((cell, ci) => {
            const valid = humanTurn && humanMoves.some(([r, c]) => r === ri && c === ci);
            return (
              <button
                key={`${ri}-${ci}`}
                type="button"
                disabled={!valid}
                onClick={() => dispatch({ type: "place", row: ri, col: ci })}
                className={cn(
                  "aspect-square rounded-sm bg-green-700/50",
                  valid && "ring-1 ring-primary",
                  cell === 1 && "bg-neutral-900",
                  cell === 2 && "bg-neutral-100"
                )}
                aria-label={`칸 ${ri + 1}-${ci + 1}`}
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
        <ResumeDialog gameTitle="Reversi" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
    </div>
  );
}
