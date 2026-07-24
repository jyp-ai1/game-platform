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
  PIECE_SYMBOL,
  type Chess960State,
  type Move,
} from "./engine";

const GAME_SLUG = "chess960";

type Action = { type: "move"; move: Move } | { type: "cpu" } | { type: "restart" };

function reducer(state: Chess960State, action: Action): Chess960State {
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

export function Chess960Game() {
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
    if (state.winner !== null || state.current !== "b") return;
    const id = setTimeout(() => dispatch({ type: "cpu" }), 600);
    return () => clearTimeout(id);
  }, [state.current, state.winner, state.board]);

  useEffect(() => {
    if (state.winner !== null) {
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
      setSelected(null);
    }
  }, [state.winner, reportScore]);

  const humanTurn =
    canPlayRef.current && state.current === "w" && state.winner === null;
  const legal = humanTurn ? getLegalMoves(state, "w") : [];

  function onCell(r: number, c: number) {
    if (!humanTurn) return;
    const move = selected
      ? legal.find(
          (m) =>
            m.from[0] === selected[0] &&
            m.from[1] === selected[1] &&
            m.to[0] === r &&
            m.to[1] === c
        )
      : null;
    if (move) {
      dispatch({ type: "move", move });
      setSelected(null);
      return;
    }
    const piece = state.board[r]![c];
    if (piece && piece[0] === "w" && legal.some((m) => m.from[0] === r && m.from[1] === c)) {
      setSelected([r, c]);
    } else {
      setSelected(null);
    }
  }

  const msg =
    state.winner === "w"
      ? "You Win!"
      : state.winner === "b"
        ? "CPU Wins!"
        : state.winner === "draw"
          ? "Draw"
          : humanTurn
            ? "Chess960 — your move"
            : "CPU...";

  const targets = selected
    ? legal.filter((m) => m.from[0] === selected[0] && m.from[1] === selected[1]).map((m) => m.to)
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
            const light = (r + c) % 2 === 0;
            const isSel = selected?.[0] === r && selected?.[1] === c;
            const isTarget = targets.some(([tr, tc]) => tr === r && tc === c);
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                disabled={!humanTurn}
                onClick={() => onCell(r, c)}
                className={cn(
                  "flex aspect-square items-center justify-center text-2xl",
                  light ? "bg-muted/50" : "bg-amber-900/30",
                  isSel && "ring-2 ring-primary",
                  isTarget && "ring-2 ring-green-400"
                )}
              >
                {cell ? PIECE_SYMBOL[cell] : null}
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
        <ResumeDialog gameTitle="Chess960" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
    </div>
  );
}
