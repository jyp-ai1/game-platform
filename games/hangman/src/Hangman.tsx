"use client";

import {
  clearSave,
  emitGameRetry,
  feelWithScore,
  PuzzlePlayField,
  ResumeDialog,
  SaveIndicator,
  StandardGameOverOverlay,
  useAutoSave,
  useGameSDK,
  useGameSession,
  useReadyCountdown,
  useResumableGame,
  useStandardGameFeel,
  playGameFeel,
} from "@game-platform/game-sdk";
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  computeScore,
  createInitialState,
  getDisplayWord,
  guessLetter,
  type HangmanDifficulty,
  type HangmanState,
} from "./engine";
import {
  HANGMAN_DIFFICULTIES,
  difficultyLabel,
  wordLengthRange,
} from "./hangman-stage-config";
import {
  playGameOverAudio,
  playMatchAudio,
  playStageClearAudio,
  playWrongAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "hangman";
const PUZZLE_FIELD_CLASS = "touch-none max-w-[min(100%,20.5rem)]";
const STAGE_BY_DIFFICULTY: Record<HangmanDifficulty, number> = { EASY: 1, MEDIUM: 2, HARD: 3 };
const KEYBOARD_ROWS = [
  "QWERTYUIOP",
  "ASDFGHJKL",
  "ZXCVBNM",
];

type Action =
  | { type: "guess"; letter: string }
  | { type: "restart"; difficulty?: HangmanDifficulty };

function reducer(state: HangmanState, action: Action): HangmanState {
  switch (action.type) {
    case "restart":
      return createInitialState(action.difficulty ?? state.difficulty);
    case "guess":
      return guessLetter(state, action.letter);
    default:
      return state;
  }
}

export function HangmanGame() {
  const { phase, initialState, onResume, onNewGame } = useResumableGame(
    GAME_SLUG,
    createInitialState
  );
  const [state, dispatch] = useReducer(reducer, initialState);
  const [puzzleNumber, setPuzzleNumber] = useState(1);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const prevGuessedRef = useRef(0);
  const prevWrongRef = useRef(0);
  const prevStatusRef = useRef(state.status);
  const score = state.status === "won" ? computeScore(state.wrongGuesses) : 0;

  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const sessionActive = phase === "ready" && !showCountdown;
  const { recordGameEnd, resetSession } = useGameSession(GAME_SLUG, sessionActive);

  const stageIndex = STAGE_BY_DIFFICULTY[state.difficulty];
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...feelWithScore(state as unknown as Record<string, unknown>, score),
    stageIndex: stageIndex + puzzleNumber - 1,
    fieldRef,
  });

  useEffect(() => {
    const correct = state.guessedLetters.filter((l) => state.word.includes(l)).length;
    if (correct > prevGuessedRef.current) {
      playMatchAudio();
      playGameFeel("correct", fieldRef.current);
    }
    prevGuessedRef.current = correct;
  }, [state.guessedLetters, state.word]);

  useEffect(() => {
    if (state.wrongGuesses > prevWrongRef.current) {
      playWrongAudio();
      playGameFeel("wrong", fieldRef.current);
    }
    prevWrongRef.current = state.wrongGuesses;
  }, [state.wrongGuesses]);

  useEffect(() => {
    if (state.status === "won" && prevStatusRef.current !== "won") {
      playStageClearAudio();
      playGameFeel("goal", fieldRef.current);
    } else if (state.status === "lost" && prevStatusRef.current !== "lost") {
      playGameOverAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "playing" ? state : null),
    [state]
  );

  useEffect(() => {
    if (state.status === "won") {
      reportScore(GAME_SLUG, computeScore(state.wrongGuesses));
      recordGameEnd({ score: computeScore(state.wrongGuesses), outcome: "clear" });
    } else if (state.status === "lost") {
      reportScore(GAME_SLUG, 0);
      recordGameEnd({ score: 0, outcome: "failure" });
    }
    if (state.status !== "playing") {
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, state.wrongGuesses, reportScore, recordGameEnd]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!canPlayRef.current || state.status !== "playing") {
        return;
      }
      if (event.key.length !== 1 || !/^[a-zA-Z]$/.test(event.key)) {
        return;
      }
      primeGameAudio();
      playGameFeel("button", fieldRef.current);
      dispatch({ type: "guess", letter: event.key });
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.status, canPlay]);

  const livesLeft = state.maxWrongGuesses - state.wrongGuesses;
  const [wordMin, wordMax] = wordLengthRange(state.difficulty);
  const interactive = canPlay && state.status === "playing";

  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry(difficulty?: HangmanDifficulty) {
    emitGameRetry(GAME_SLUG);
    resetSession();
    resetGameAudioPrime();
    prevGuessedRef.current = 0;
    prevWrongRef.current = 0;
    if (state.status !== "playing") setPuzzleNumber((n) => n + 1);
    dispatch({ type: "restart", difficulty });
  }

  function handleNewGame() {
    onNewGame();
    resetSession();
    resetGameAudioPrime();
    prevGuessedRef.current = 0;
    if (state.status !== "playing") setPuzzleNumber((n) => n + 1);
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-3 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <ScoreBox label="Puzzle #" value={puzzleNumber} />
          <ScoreBox label="Stage" value={stageIndex} />
          <ScoreBox label="Letters" value={`${wordMin}-${wordMax}`} />
          <ScoreBox label="Lives" value={livesLeft} />
          <ScoreBox label="Best" value={feel.bestScore} />
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={() => handleRetry()}
        >
          <RotateCcw />
        </Button>
      </div>
      <div className="flex w-full max-w-sm flex-wrap gap-1">
        {HANGMAN_DIFFICULTIES.map((level) => (
          <Button
            key={level}
            variant={state.difficulty === level ? "default" : "outline"}
            size="sm"
            className="min-h-9 flex-1 text-xs"
            disabled={state.status === "playing" && state.guessedLetters.length > 0}
            onClick={() => handleRetry(level)}
          >
            {difficultyLabel(level)}
          </Button>
        ))}
      </div>

      <div className="flex gap-1.5">
        {Array.from({ length: state.maxWrongGuesses }, (_, index) => (
          <div
            key={index}
            className={cn(
              "size-3 rounded-full",
              index < livesLeft ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      <PuzzlePlayField fieldRef={fieldRef} bursts={feel.bursts} className={PUZZLE_FIELD_CLASS}>
      <div className="relative flex w-full touch-none select-none flex-col items-center gap-6 rounded-xl bg-muted p-6">
        <p className="text-center text-2xl font-bold tracking-widest tabular-nums">
          {state.status === "lost" ? state.word.split("").join(" ") : getDisplayWord(state)}
        </p>

        <div className="flex flex-col items-center gap-1.5">
          {KEYBOARD_ROWS.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1.5">
              {row.split("").map((letter) => {
                const guessed = state.guessedLetters.includes(letter);
                const correct = guessed && state.word.includes(letter);
                return (
                  <button
                    key={letter}
                    type="button"
                    disabled={guessed || !interactive}
                    onClick={() => {
                      primeGameAudio();
                      playGameFeel("button", fieldRef.current);
                      dispatch({ type: "guess", letter });
                    }}
                    aria-label={`${letter} 추측`}
                    className={cn(
                      "flex min-h-11 min-w-11 items-center justify-center rounded-md text-sm font-semibold transition-transform duration-150 active:scale-95 disabled:pointer-events-none",
                      !guessed && "bg-background hover:bg-primary/20",
                      guessed && correct && "bg-primary text-primary-foreground",
                      guessed && !correct && "bg-destructive/20 text-destructive"
                    )}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {state.status !== "playing" ? (
          <StandardGameOverOverlay
            message={
              state.status === "won"
                ? "You Win!"
                : `Game Over — ${state.word}`
            }
            score={state.status === "won" ? computeScore(state.wrongGuesses) : undefined}
            gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={handleExit}
            onRetry={handleRetry}
            onRestart={handleRetry}
          />
        ) : null}
        {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}
      </div>
      </PuzzlePlayField>

      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Hangman" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}

      <p className="text-xs text-muted-foreground">
        키보드 또는 화면의 글자를 눌러 단어를 맞혀보세요.
      </p>
    </div>
  );
}
