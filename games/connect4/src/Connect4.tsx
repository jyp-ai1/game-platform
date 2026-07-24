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
  dropDisc,
  type Connect4State,
} from "./engine";

const GAME_SLUG = "connect4";
const CPU_DELAY = 450;

type Action =
  | { type: "drop"; col: number }
  | { type: "cpu" }
  | { type: "restart" };

function reducer(state: Connect4State, action: Action): Connect4State {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "drop":
      return dropDisc(state, action.col);
    case "cpu":
      return cpuMove(state);
    default:
      return state;
  }
}

export function Connect4Game() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.winner !== null ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.winner !== null || state.current !== 2) return;
    const id = setTimeout(() => dispatch({ type: "cpu" }), CPU_DELAY);
    return () => clearTimeout(id);
  }, [state.current, state.winner]);

  useEffect(() => {
    if (state.winner !== null) {
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
    }
  }, [state.winner, reportScore]);

  const humanTurn =
    canPlayRef.current && state.current === 1 && state.winner === null;
  const msg =
    state.winner === 1
      ? "You Win!"
      : state.winner === 2
        ? "CPU Wins!"
        : state.winner === "draw"
          ? "Draw"
          : humanTurn
            ? "열을 탭해 디스크를 놓으세요"
            : "CPU 차례...";

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{msg}</p>
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <div className="flex w-full max-w-sm gap-1">
        {Array.from({ length: 7 }, (_, col) => (
          <button
            key={col}
            type="button"
            disabled={!humanTurn}
            aria-label={`열 ${col + 1}`}
            onClick={() => dispatch({ type: "drop", col })}
            className="flex-1 rounded bg-muted py-2 text-xs hover:bg-primary/20 disabled:opacity-40"
          >
            ▼
          </button>
        ))}
      </div>
      <div className="grid w-full max-w-sm grid-cols-7 gap-1 rounded-xl bg-primary/20 p-2">
        {state.board.map((row, ri) =>
          row.map((cell, ci) => {
            const win = state.winningCells.some(([r, c]) => r === ri && c === ci);
            return (
              <div
                key={`${ri}-${ci}`}
                className={cn(
                  "aspect-square rounded-full bg-background/80",
                  cell === 1 && "bg-primary",
                  cell === 2 && "bg-destructive",
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
        <ResumeDialog gameTitle="Connect 4" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
    </div>
  );
}
