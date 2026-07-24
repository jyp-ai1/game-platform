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
  clearCell,
  computeScore,
  createInitialState,
  enterDigit,
  selectCell,
  SIZE,
  type ClueCell,
  type KakuroState,
} from "./engine";

const GAME_SLUG = "kakuro";
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type Action =
  | { type: "select"; row: number; col: number }
  | { type: "digit"; n: number }
  | { type: "clear" }
  | { type: "restart" };

function reducer(state: KakuroState, action: Action): KakuroState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "select":
      return selectCell(state, action.row, action.col);
    case "digit":
      return enterDigit(state, action.n);
    case "clear":
      return clearCell(state);
    default:
      return state;
  }
}

export function KakuroGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "won" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status === "won") {
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
    }
  }, [state.status, reportScore]);

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm justify-end">
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Fill digits 1–9 to match sum clues</p>
      <div className="grid w-full max-w-sm grid-cols-4 gap-0.5">
        {Array.from({ length: SIZE * SIZE }, (_, i) => {
          const r = Math.floor(i / SIZE);
          const c = i % SIZE;
          const cell = state.grid[r]![c]!;
          const sel = state.selected?.[0] === r && state.selected?.[1] === c;
          if (cell.kind === "blank") {
            return <div key={i} className="aspect-square bg-muted" />;
          }
          if (cell.kind === "clue") {
            return (
              <div key={i} className="flex aspect-square flex-col justify-center bg-zinc-800 p-1 text-[10px] leading-tight text-muted-foreground">
                {(cell as ClueCell).down !== undefined ? (
                  <span className="text-center">{(cell as ClueCell).down}</span>
                ) : null}
                {(cell as ClueCell).across !== undefined ? (
                  <span className="text-right">{(cell as ClueCell).across}</span>
                ) : null}
              </div>
            );
          }
          return (
            <button
              key={i}
              type="button"
              disabled={!canPlayRef.current || state.status === "won"}
              onClick={() => dispatch({ type: "select", row: r, col: c })}
              className={cn(
                "aspect-square border text-lg font-bold",
                sel ? "border-primary bg-primary/10" : "border-border bg-background"
              )}
            >
              {state.entries[r]![c] ?? ""}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-1">
        {DIGITS.map((n) => (
          <Button
            key={n}
            variant="outline"
            size="sm"
            disabled={!state.selected || state.status === "won"}
            onClick={() => dispatch({ type: "digit", n })}
          >
            {n}
          </Button>
        ))}
        <Button variant="ghost" size="sm" disabled={!state.selected} onClick={() => dispatch({ type: "clear" })}>
          Clear
        </Button>
      </div>
      {state.status === "won" ? (
        <GameOverOverlay
          message="Kakuro solved!"
          score={computeScore(state)}
          gameSlug={GAME_SLUG}
          onRetry={() => emitGameRetry(GAME_SLUG)}
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Kakuro" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
    </div>
  );
}
