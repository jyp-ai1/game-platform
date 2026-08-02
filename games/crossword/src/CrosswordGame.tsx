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
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  clearCell,
  computeScore,
  createInitialState,
  enterLetter,
  isPlayableCell,
  selectCell,
  SIZE,
  tickElapsed,
  type CrosswordState,
} from "./engine";
import {
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "crossword";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

type Action =
  | { type: "select"; row: number; col: number }
  | { type: "letter"; letter: string }
  | { type: "clear" }
  | { type: "tick" }
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
    case "tick":
      return tickElapsed(state);
    default:
      return state;
  }
}

export function CrosswordGame() {
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
  const prevStatusRef = useRef(state.status);
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
    if (state.status === "won" && prevStatusRef.current !== "won") {
      playStageClearAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    if (state.status === "won") {
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, reportScore]);

  useEffect(() => {
    if (state.status !== "playing" || showCountdown) return;
    const id = window.setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => window.clearInterval(id);
  }, [state.status, showCountdown]);

  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    resetGameAudioPrime();
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    resetGameAudioPrime();
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Time" value={state.elapsedSeconds} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
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
      <PuzzlePlayField fieldRef={fieldRef} bursts={feel.bursts} className="touch-none">
      <div className="grid w-full grid-cols-5 gap-0.5">
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
              onClick={() => {
                primeGameAudio();
                playGameFeel("button", fieldRef.current);
                dispatch({ type: "select", row: r, col: c });
              }}
              className={cn(
                "aspect-square min-h-11 min-w-11 border text-lg font-bold uppercase transition-transform duration-150 active:scale-95",
                sel ? "border-primary bg-primary/10" : "border-border bg-background"
              )}
            >
              {state.entries[r]![c] || ""}
            </button>
          );
        })}
      </div>
      </PuzzlePlayField>
      <div className="flex max-w-sm flex-wrap justify-center gap-1">
        {LETTERS.map((L) => (
          <Button
            key={L}
            variant="outline"
            size="sm"
            disabled={!state.selected || state.status === "won"}
            onClick={() => {
              primeGameAudio();
              playGameFeel("button", fieldRef.current);
              dispatch({ type: "letter", letter: L });
            }}
          >
            {L}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          disabled={!state.selected}
          onClick={() => {
            primeGameAudio();
            playGameFeel("button", fieldRef.current);
            dispatch({ type: "clear" });
          }}
        >
          Clear
        </Button>
      </div>
      {state.status === "won" ? (
        <StandardGameOverOverlay
          message="Puzzle complete!"
          score={computeScore(state)}
          gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={handleExit}
          onRetry={handleRetry}
          onRestart={handleRetry}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Crossword" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
    </div>
  );
}
