"use client";

import { useGameSDK } from "@game-platform/game-sdk";
import { Button, cn, GameOverOverlay } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useEffect, useReducer } from "react";

import {
  cpuMove,
  createInitialState,
  playMove,
  type TicTacToeState,
} from "./engine";

const GAME_SLUG = "tic-tac-toe";
const CPU_MOVE_DELAY_MS = 500;
// There's no natural numeric score in tic-tac-toe, so we report a flat
// fixed value when the human wins (and don't report on draw or CPU win).
const WIN_SCORE = 100;

type Action =
  | { type: "playMove"; index: number }
  | { type: "cpuMove" }
  | { type: "restart" };

function reducer(state: TicTacToeState, action: Action): TicTacToeState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "playMove":
      return playMove(state, action.index);
    case "cpuMove":
      return cpuMove(state);
    default:
      return state;
  }
}

function statusMessage(state: TicTacToeState): string {
  if (state.winner === "X") return "You Win!";
  if (state.winner === "O") return "CPU Wins!";
  if (state.winner === "draw") return "Draw";
  return state.currentPlayer === "X" ? "당신의 차례입니다" : "CPU가 생각 중...";
}

export function TicTacToeGame() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const { reportScore } = useGameSDK();

  // React to the turn changing to the CPU: schedule its move after a short,
  // natural-feeling pause. This is a legitimate effect (reacting to a state
  // transition caused by the player's move), not a synchronous state set.
  useEffect(() => {
    if (state.winner !== null || state.currentPlayer !== "O") {
      return;
    }
    const id = setTimeout(() => dispatch({ type: "cpuMove" }), CPU_MOVE_DELAY_MS);
    return () => clearTimeout(id);
  }, [state.currentPlayer, state.winner]);

  useEffect(() => {
    if (state.winner === "X") {
      reportScore(GAME_SLUG, WIN_SCORE);
    }
  }, [state.winner, reportScore]);

  const isHumanTurn = state.currentPlayer === "X" && state.winner === null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-sm items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          {statusMessage(state)}
        </p>
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={() => dispatch({ type: "restart" })}
        >
          <RotateCcw />
        </Button>
      </div>

      <div className="relative grid aspect-square w-full max-w-sm grid-cols-3 gap-2 rounded-xl bg-muted p-2">
        {state.board.map((cell, index) => {
          const isWinningCell = state.winningLine?.includes(index) ?? false;
          return (
            <button
              key={index}
              type="button"
              onClick={() => dispatch({ type: "playMove", index })}
              disabled={!isHumanTurn || cell !== null}
              aria-label={cell ? `칸 ${index + 1}: ${cell}` : `칸 ${index + 1}`}
              className={cn(
                "flex items-center justify-center rounded-lg bg-background text-4xl font-bold transition-colors",
                !cell && isHumanTurn && "hover:bg-muted-foreground/20",
                isWinningCell && "bg-primary/30",
                cell === "X" && "text-primary",
                cell === "O" && "text-destructive"
              )}
            >
              {cell}
            </button>
          );
        })}

        {state.winner !== null ? (
          <GameOverOverlay
            message={statusMessage(state)}
            onRestart={() => dispatch({ type: "restart" })}
          />
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        당신은 X입니다. CPU를 상대로 승리해보세요.
      </p>
    </div>
  );
}
