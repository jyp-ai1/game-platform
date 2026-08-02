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
  useGameSession,
  useReadyCountdown,
  useResumableGame,
  useStandardGameFeel,
} from "@game-platform/game-sdk";
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  clearSelection,
  computeScore,
  createInitialState,
  isAnchor,
  isHighlighted,
  selectCell,
  type WordSearchDifficulty,
  type WordSearchState,
} from "./engine";
import {
  WORD_SEARCH_DIFFICULTIES,
  difficultyLabel,
} from "./word-search-stage-config";
import {
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "word-search";
const PUZZLE_FIELD_CLASS = "touch-none max-w-[min(100%,20.5rem)]";
const STAGE_BY_DIFFICULTY: Record<WordSearchDifficulty, number> = { EASY: 1, MEDIUM: 2, HARD: 3 };

type Action =
  | { type: "select"; row: number; col: number }
  | { type: "clear" }
  | { type: "restart"; difficulty?: WordSearchDifficulty };

function reducer(state: WordSearchState, action: Action): WordSearchState {
  switch (action.type) {
    case "restart":
      return createInitialState(action.difficulty ?? state.difficulty);
    case "select":
      return selectCell(state, action.row, action.col);
    case "clear":
      return clearSelection(state);
    default:
      return state;
  }
}

export function WordSearchGame() {
  const { phase, initialState, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

  const sessionActive = phase === "ready" && !showCountdown;
  const { recordGameEnd, resetSession } = useGameSession(GAME_SLUG, sessionActive);

  const [state, dispatch] = useReducer(reducer, initialState);
  const [puzzleNumber, setPuzzleNumber] = useState(1);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const prevFoundRef = useRef(state.found.length);
  const prevStatusRef = useRef(state.status);
  const score = computeScore(state);
  const stageIndex = STAGE_BY_DIFFICULTY[state.difficulty] + puzzleNumber - 1;
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...feelWithScore(state as unknown as Record<string, unknown>, score),
    stageIndex,
    fieldRef,
  });

  useEffect(() => {
    if (state.found.length > prevFoundRef.current) {
      playGameFeel(state.found.length >= 4 ? "combo" : "match", fieldRef.current);
    }
    prevFoundRef.current = state.found.length;
  }, [state.found.length]);

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
      reportScore(GAME_SLUG, score);
      recordGameEnd({ score, outcome: "clear" });
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, state.found.length, score, reportScore, recordGameEnd]);

  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry(difficulty?: WordSearchDifficulty) {
    emitGameRetry(GAME_SLUG);
    resetSession();
    resetGameAudioPrime();
    if (state.status !== "playing") setPuzzleNumber((n) => n + 1);
    dispatch({ type: "restart", difficulty });
  }

  function handleNewGame() {
    onNewGame();
    resetSession();
    resetGameAudioPrime();
    if (state.status !== "playing") setPuzzleNumber((n) => n + 1);
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-3 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <ScoreBox label="Puzzle #" value={puzzleNumber} />
          <ScoreBox label="Found" value={`${state.found.length}/${state.words.length}`} />
          <ScoreBox label="Score" value={score} />
          <ScoreBox label="Best" value={feel.bestScore} />
        </div>
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => handleRetry()}>
          <RotateCcw />
        </Button>
      </div>
      <div className="flex w-full max-w-sm flex-wrap gap-1">
        {WORD_SEARCH_DIFFICULTIES.map((level) => (
          <Button
            key={level}
            variant={state.difficulty === level ? "default" : "outline"}
            size="sm"
            className="min-h-9 flex-1 text-xs"
            onClick={() => handleRetry(level)}
          >
            {difficultyLabel(level)}
          </Button>
        ))}
      </div>
      <ul className="flex flex-wrap gap-2 text-sm">
        {state.words.map((w) => (
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
      <PuzzlePlayField fieldRef={fieldRef} bursts={feel.bursts} className={PUZZLE_FIELD_CLASS}>
        <div
          className="grid w-full gap-0.5"
          style={{ gridTemplateColumns: `repeat(${state.size}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: state.size * state.size }, (_, i) => {
            const r = Math.floor(i / state.size);
            const c = i % state.size;
            const letter = state.grid[r]![c];
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
                  "aspect-square min-h-11 min-w-11 text-sm font-bold uppercase transition-transform duration-150 active:scale-95",
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
          onExit={handleExit}
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
