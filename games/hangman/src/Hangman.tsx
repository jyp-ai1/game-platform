"use client";

import {
  clearSave,
  emitGameRetry,
  ResumeDialog,
  SaveIndicator,
  StandardGameOverOverlay,
  useAutoSave,
  useGameSDK,
  useReadyCountdown,
  useResumableGame,
  standardFeelFromState,
  useStandardGameFeel,
  playGameFeel,
  GameFeelLayer,
} from "@game-platform/game-sdk";
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  computeScore,
  createInitialState,
  getDisplayWord,
  guessLetter,
  type HangmanState,
} from "./engine";

const GAME_SLUG = "hangman";
const KEYBOARD_ROWS = [
  "QWERTYUIOP",
  "ASDFGHJKL",
  "ZXCVBNM",
];

type Action = { type: "guess"; letter: string } | { type: "restart" };

function reducer(state: HangmanState, action: Action): HangmanState {
  switch (action.type) {
    case "restart":
      return createInitialState();
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
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const prevGuessedRef = useRef(0);
  useEffect(() => {
    const correct = state.guessedLetters.filter((l) => state.word.includes(l)).length;
    if (correct > prevGuessedRef.current) {
      playGameFeel("pop", fieldRef.current);
    }
    prevGuessedRef.current = correct;
  }, [state.guessedLetters, state.word]);

  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    fieldRef,
  });
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
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
    } else if (state.status === "lost") {
      reportScore(GAME_SLUG, 0);
    }
    if (state.status !== "playing") {
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.wrongGuesses, reportScore]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!canPlayRef.current || state.status !== "playing") {
        return;
      }
      if (event.key.length !== 1 || !/^[a-zA-Z]$/.test(event.key)) {
        return;
      }
      playGameFeel("button", fieldRef.current);
      dispatch({ type: "guess", letter: event.key });
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.status, canPlay]);

  const livesLeft = state.maxWrongGuesses - state.wrongGuesses;
  const interactive = canPlay && state.status === "playing";

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    prevGuessedRef.current = 0;
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    prevGuessedRef.current = 0;
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Lives" value={livesLeft} />
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={handleRetry}
        >
          <RotateCcw />
        </Button>
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

      <div ref={fieldRef} className="relative flex w-full max-w-sm touch-none select-none flex-col items-center gap-6 rounded-xl bg-muted p-6">
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
                      playGameFeel("button", fieldRef.current);
                      dispatch({ type: "guess", letter });
                    }}
                    aria-label={`${letter} 추측`}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md text-sm font-semibold transition-colors disabled:pointer-events-none",
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
            onExit={feel.handleExit}
            onRetry={handleRetry}
            onRestart={handleRetry}
          />
        ) : null}
        {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}

        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}
      </div>

      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Hangman" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}

      <p className="text-xs text-muted-foreground">
        키보드 또는 화면의 글자를 눌러 단어를 맞혀보세요.
      </p>
    </div>
  );
}
