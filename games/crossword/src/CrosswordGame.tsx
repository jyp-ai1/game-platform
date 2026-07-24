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
  enterLetter,
  isPlayableCell,
  selectCell,
  SIZE,
  type CrosswordState,
} from "./engine";

const GAME_SLUG = "crossword";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

type Action =
  | { type: "select"; row: number; col: number }
  | { type: "letter"; letter: string }
  | { type: "clear" }
  | { type: "restart" };

function reducer(state: CrosswordState, action: Action): CrosswordState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "select":
      return selectCell(state, action.row, action.col);
    case "letter":
      return enterLetter(state, action.letter);
    case "clear":
      return clearCell(state);
    default:
      return state;
  }
}

export function CrosswordGame() {
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
      <ul className="w-full max-w-sm space-y-1 text-sm">
        {state.clues.map((clue) => (
          <li key={clue.id}>
            <span className="font-medium">{clue.id} {clue.direction}:</span> {clue.text}
          </li>
        ))}
      </ul>
      <div className="grid w-full max-w-sm grid-cols-5 gap-0.5">
        {Array.from({ length: SIZE * SIZE }, (_, i) => {
          const r = Math.floor(i / SIZE);
          const c = i % SIZE;
          if (!isPlayableCell(r, c)) {
            return <div key={i} className="aspect-square bg-muted/80" />;
          }
          const sel = state.selected?.[0] === r && state.selected?.[1] === c;
          return (
            <button
              key={i}
              type="button"
              disabled={!canPlayRef.current || state.status === "won"}
              onClick={() => dispatch({ type: "select", row: r, col: c })}
              className={cn(
                "aspect-square border text-lg font-bold uppercase",
                sel ? "border-primary bg-primary/10" : "border-border bg-background"
              )}
            >
              {state.entries[r]![c] || ""}
            </button>
          );
        })}
      </div>
      <div className="flex max-w-sm flex-wrap justify-center gap-1">
        {LETTERS.map((L) => (
          <Button
            key={L}
            variant="outline"
            size="sm"
            disabled={!state.selected || state.status === "won"}
            onClick={() => dispatch({ type: "letter", letter: L })}
          >
            {L}
          </Button>
        ))}
        <Button variant="ghost" size="sm" disabled={!state.selected} onClick={() => dispatch({ type: "clear" })}>
          Clear
        </Button>
      </div>
      {state.status === "won" ? (
        <GameOverOverlay
          message="Puzzle complete!"
          score={computeScore(state)}
          gameSlug={GAME_SLUG}
          onRetry={() => emitGameRetry(GAME_SLUG)}
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Crossword" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
    </div>
  );
}
