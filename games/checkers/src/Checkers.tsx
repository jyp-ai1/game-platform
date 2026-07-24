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
import { useEffect, useReducer, useState } from "react";

import {
  applyMove,
  computeScore,
  cpuMove,
  createInitialState,
  getLegalMoves,
  type CheckersState,
} from "./engine";

const GAME_SLUG = "checkers";

type Action =
  | { type: "move"; move: ReturnType<typeof getLegalMoves>[number] }
  | { type: "cpu" }
  | { type: "restart" };

function reducer(state: CheckersState, action: Action): CheckersState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "cpu":
      return cpuMove(state);
    case "move":
      return applyMove(state, action.move);
    default:
      return state;
  }
}

export function CheckersGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const { reportScore } = useGameSDK();

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.winner !== null ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.winner !== null || state.current !== 2) return;
    const id = setTimeout(() => dispatch({ type: "cpu" }), 500);
    return () => clearTimeout(id);
  }, [state.current, state.winner, state.board, state.mustContinue]);

  useEffect(() => {
    if (state.winner !== null) {
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
      setSelected(null);
    }
  }, [state.winner, reportScore]);

  const humanTurn =
    canPlayRef.current && state.current === 1 && state.winner === null;
  const legal = humanTurn ? getLegalMoves(state, 1) : [];

  function onCell(r: number, c: number) {
    if (!humanTurn) return;
    if (state.mustContinue) {
      const jump = legal.find((m) => m.to[0] === r && m.to[1] === c);
      if (jump) {
        dispatch({ type: "move", move: jump });
        setSelected(null);
      }
      return;
    }
    const moveHere = selected
      ? legal.find(
          (m) =>
            m.from[0] === selected[0] &&
            m.from[1] === selected[1] &&
            m.to[0] === r &&
            m.to[1] === c
        )
      : null;
    if (moveHere) {
      dispatch({ type: "move", move: moveHere });
      setSelected(null);
      return;
    }
    if (legal.some((m) => m.from[0] === r && m.from[1] === c)) setSelected([r, c]);
    else setSelected(null);
  }

  const msg =
    state.winner === 1
      ? "You Win!"
      : state.winner === 2
        ? "CPU Wins!"
        : state.winner === "draw"
          ? "Draw"
          : humanTurn
            ? state.mustContinue
              ? "Continue jumping!"
              : "Select a piece"
            : "CPU...";

  const targets = selected
    ? legal
        .filter((m) => m.from[0] === selected[0] && m.from[1] === selected[1])
        .map((m) => m.to)
    : [];

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{msg}</p>
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={() => {
            dispatch({ type: "restart" });
            setSelected(null);
          }}
        >
          <RotateCcw />
        </Button>
      </div>
      <div className="grid w-full max-w-sm grid-cols-8 gap-0.5 rounded-xl border border-border p-1">
        {state.board.map((row, r) =>
          row.map((cell, c) => {
            const dark = (r + c) % 2 === 1;
            const isSel = selected?.[0] === r && selected?.[1] === c;
            const isTarget = targets.some(([tr, tc]) => tr === r && tc === c);
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                disabled={!dark || !humanTurn}
                onClick={() => onCell(r, c)}
                className={cn(
                  "aspect-square rounded-sm",
                  dark ? "bg-amber-900/40" : "bg-muted/30",
                  isSel && "ring-2 ring-primary",
                  isTarget && "ring-2 ring-green-400"
                )}
              >
                {cell === 1 || cell === 2 ? (
                  <span
                    className={cn(
                      "mx-auto block size-[70%] rounded-full bg-primary",
                      cell === 2 && "ring-2 ring-amber-300"
                    )}
                  />
                ) : cell === 3 || cell === 4 ? (
                  <span
                    className={cn(
                      "mx-auto block size-[70%] rounded-full bg-destructive",
                      cell === 4 && "ring-2 ring-amber-300"
                    )}
                  />
                ) : null}
              </button>
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
          onRestart={() => {
            dispatch({ type: "restart" });
            setSelected(null);
          }}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Checkers" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
    </div>
  );
}
