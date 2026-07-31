"use client";

import {
  clearSave,
  emitGameRetry,
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
import { Button, cn, ReadyCountdown } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { Fragment, useCallback, useEffect, useReducer, useRef } from "react";

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
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    fieldRef,
  });

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "won" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status === "won") {
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
      playGameFeel("goal", fieldRef.current);
    }
  }, [state.status, reportScore]);

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm justify-end">
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Tap to fill — right-click to mark empty</p>
      <PuzzlePlayField fieldRef={fieldRef} bursts={feel.bursts} className="touch-none">
      <div className="w-full max-w-sm">
        <div
          className="grid gap-0.5"
          style={{ gridTemplateColumns: `auto repeat(${SIZE}, minmax(0, 1fr))` }}
        >
          <div />
          {state.colHints.map((h, i) => (
            <div key={`c${i}`} className="flex aspect-square items-end justify-center text-[10px] font-mono sm:text-xs">
              {formatHint(h)}
            </div>
          ))}
          {state.rowHints.map((h, r) => (
            <Fragment key={`row-${r}`}>
              <div className="flex aspect-square items-center justify-end pr-0.5 text-[10px] font-mono sm:text-xs">
                {formatHint(h)}
              </div>
              {Array.from({ length: SIZE }, (_, c) => {
                const mark = state.marks[r]![c];
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    disabled={!canPlayRef.current || state.status === "won"}
                    onClick={() => {
                      playGameFeel("button", fieldRef.current);
                      dispatch({ type: "fill", row: r, col: c });
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      dispatch({ type: "empty", row: r, col: c });
                    }}
                    className={cn(
                      "aspect-square w-full border border-border text-[10px] sm:text-xs",
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
      </div>
      </PuzzlePlayField>
      {state.status === "won" ? (
        <StandardGameOverOverlay
          message="Picture complete!"
          score={computeScore(state)}
          gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={feel.handleExit}
          onRetry={handleRetry}
          onRestart={handleRetry}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Nonogram" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
    </div>
  );
}
