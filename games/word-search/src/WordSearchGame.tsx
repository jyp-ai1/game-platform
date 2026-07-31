"use client";

import {
  clearSave,
  emitGameRetry,
  feelWithScore,
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
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  clearSelection,
  computeScore,
  createInitialState,
  isAnchor,
  isHighlighted,
  selectCell,
  SIZE,
  WORDS,
  type WordSearchState,
} from "./engine";

const GAME_SLUG = "word-search";

type Action =
  | { type: "select"; row: number; col: number }
  | { type: "clear" }
  | { type: "restart" };

function reducer(state: WordSearchState, action: Action): WordSearchState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "select":
      return selectCell(state, action.row, action.col);
    case "clear":
      return clearSelection(state);
    default:
      return state;
  }
}

export function WordSearchGame() {
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
  const prevFoundRef = useRef(state.found.length);
  const score = computeScore(state);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...feelWithScore(state as unknown as Record<string, unknown>, score),
    fieldRef,
  });

  useEffect(() => {
    if (state.found.length > prevFoundRef.current) {
      playGameFeel("match", fieldRef.current);
    }
    prevFoundRef.current = state.found.length;
  }, [state.found.length]);

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "won" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status === "won") {
      playGameFeel("goal", fieldRef.current);
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.found.length, reportScore]);

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Found" value={state.found.length} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <ul className="flex flex-wrap gap-2 text-sm">
        {WORDS.map((w) => (
          <li
            key={w}
            className={cn(
              "rounded px-2 py-0.5 font-mono",
              state.found.includes(w) ? "bg-primary/20 line-through opacity-60" : "bg-muted"
            )}
          >
            {w}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Tap start cell, then end cell along a straight line</p>
      <PuzzlePlayField fieldRef={fieldRef} bursts={feel.bursts} className="touch-none">
      <div className="grid w-full grid-cols-8 gap-0.5">
        {Array.from({ length: SIZE * SIZE }, (_, i) => {
          const r = Math.floor(i / SIZE);
          const c = i % SIZE;
          const letter = state.grid[r]![c];
          return (
            <button
              key={i}
              type="button"
              disabled={!canPlayRef.current || state.status === "won"}
              onClick={() => {
                playGameFeel("button", fieldRef.current);
                dispatch({ type: "select", row: r, col: c });
              }}
              className={cn(
                "aspect-square text-sm font-bold uppercase",
                isHighlighted(state, r, c) && "bg-primary text-primary-foreground",
                isAnchor(state, r, c) && "ring-2 ring-amber-400",
                !isHighlighted(state, r, c) && "bg-background border border-border"
              )}
            >
              {letter}
            </button>
          );
        })}
      </div>
      </PuzzlePlayField>
      {state.anchor ? (
        <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "clear" })}>
          Clear selection
        </Button>
      ) : null}
      {state.status === "won" ? (
        <StandardGameOverOverlay
          message="All words found!"
          score={score}
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
        <ResumeDialog gameTitle="Word Search" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
    </div>
  );
}
