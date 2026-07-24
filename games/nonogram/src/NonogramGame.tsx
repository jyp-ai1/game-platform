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
import { Fragment, useEffect, useReducer } from "react";

import {
  computeScore,
  createInitialState,
  formatHint,
  markEmpty,
  SIZE,
  toggleCell,
  type NonogramState,
} from "./engine";

const GAME_SLUG = "nonogram";

type Action =
  | { type: "fill"; row: number; col: number }
  | { type: "empty"; row: number; col: number }
  | { type: "restart" };

function reducer(state: NonogramState, action: Action): NonogramState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "fill":
      return toggleCell(state, action.row, action.col);
    case "empty":
      return markEmpty(state, action.row, action.col);
    default:
      return state;
  }
}

export function NonogramGame() {
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
      <p className="text-sm text-muted-foreground">Tap to fill — right-click to mark empty</p>
      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `auto repeat(${SIZE}, 2rem)` }}>
        <div />
        {state.colHints.map((h, i) => (
          <div key={`c${i}`} className="flex h-8 items-end justify-center text-xs font-mono">
            {formatHint(h)}
          </div>
        ))}
        {state.rowHints.map((h, r) => (
          <Fragment key={`row-${r}`}>
            <div className="flex w-8 items-center justify-end pr-1 text-xs font-mono">
              {formatHint(h)}
            </div>
            {Array.from({ length: SIZE }, (_, c) => {
              const mark = state.marks[r]![c];
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  disabled={!canPlayRef.current || state.status === "won"}
                  onClick={() => dispatch({ type: "fill", row: r, col: c })}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    dispatch({ type: "empty", row: r, col: c });
                  }}
                  className={cn(
                    "size-8 border border-border",
                    mark === true && "bg-primary",
                    mark === false && "text-muted-foreground"
                  )}
                >
                  {mark === false ? "×" : ""}
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>
      {state.status === "won" ? (
        <GameOverOverlay
          message="Picture complete!"
          score={computeScore(state)}
          gameSlug={GAME_SLUG}
          onRetry={() => emitGameRetry(GAME_SLUG)}
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Nonogram" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
    </div>
  );
}
