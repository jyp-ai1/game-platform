"use client";

import {
  clearSave,
  emitGameRetry,
  ResumeDialog,
  SaveIndicator,
  useAutoSave,
  useGameSDK,
  useReadyCountdown,
  useResumableGame,
} from "@game-platform/game-sdk";
import { Button, cn, GameOverOverlay, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useEffect, useReducer } from "react";

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
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "playing" ? state : null),
    [state]
  );

  useEffect(() => {
    if (state.status === "won") {
      reportScore(GAME_SLUG, computeScore(state.wrongGuesses));
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
      dispatch({ type: "guess", letter: event.key });
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.status, canPlay]);

  const livesLeft = state.maxWrongGuesses - state.wrongGuesses;
  const interactive = canPlay && state.status === "playing";

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Lives" value={livesLeft} />
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={() => dispatch({ type: "restart" })}
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

      <div className="relative flex w-full max-w-sm flex-col items-center gap-6 rounded-xl bg-muted p-6">
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
                    onClick={() => dispatch({ type: "guess", letter })}
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
          <GameOverOverlay
            message={
              state.status === "won"
                ? "You Win!"
                : `Game Over — ${state.word}`
            }
            score={state.status === "won" ? computeScore(state.wrongGuesses) : undefined}
            gameSlug={GAME_SLUG}
            onRetry={() => emitGameRetry(GAME_SLUG)}
            onRestart={() => dispatch({ type: "restart" })}
          />
        ) : null}
        {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      </div>

      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Hangman" onResume={onResume} onNewGame={onNewGame} />
      ) : null}

      <p className="text-xs text-muted-foreground">
        키보드 또는 화면의 글자를 눌러 단어를 맞혀보세요.
      </p>
    </div>
  );
}
