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
import { Button, cn, GameOverOverlay, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useEffect, useReducer, useRef } from "react";

import { computeScore, createShuffledCards, type Card } from "./engine";

const GAME_SLUG = "memory";
const MISMATCH_DELAY_MS = 800;

interface State {
  cards: Card[];
  flipped: number[];
  moves: number;
  status: "playing" | "won";
}

type Action =
  | { type: "flip"; index: number }
  | { type: "resolve" }
  | { type: "restart" };

function createInitialState(): State {
  return {
    cards: createShuffledCards(),
    flipped: [],
    moves: 0,
    status: "playing",
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "resolve":
      return { ...state, flipped: [] };
    case "flip": {
      if (state.status === "won" || state.flipped.length >= 2) {
        return state;
      }
      const card = state.cards[action.index];
      if (!card || card.matched || state.flipped.includes(action.index)) {
        return state;
      }

      const flipped = [...state.flipped, action.index];
      if (flipped.length < 2) {
        return { ...state, flipped };
      }

      const [firstIndex, secondIndex] = flipped as [number, number];
      const first = state.cards[firstIndex]!;
      const second = state.cards[secondIndex]!;
      const moves = state.moves + 1;

      if (first.symbol === second.symbol) {
        const cards = state.cards.map((c, i) =>
          i === firstIndex || i === secondIndex ? { ...c, matched: true } : c
        );
        const won = cards.every((c) => c.matched);
        return { cards, flipped: [], moves, status: won ? "won" : "playing" };
      }

      // Leave both mismatched cards visible; the component schedules a
      // "resolve" dispatch after a short delay so the player can see them.
      return { ...state, flipped, moves };
    }
    default:
      return state;
  }
}

export function MemoryGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "won" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.flipped.length !== 2) {
      return;
    }
    timeoutRef.current = setTimeout(() => {
      dispatch({ type: "resolve" });
    }, MISMATCH_DELAY_MS);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [state.flipped]);

  useEffect(() => {
    if (state.status === "won") {
      reportScore(GAME_SLUG, computeScore(state.moves));
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.moves, reportScore]);

  function handleFlip(index: number) {
    if (!canPlayRef.current) {
      return;
    }
    dispatch({ type: "flip", index });
  }

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Moves" value={state.moves} />
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={() => dispatch({ type: "restart" })}
        >
          <RotateCcw />
        </Button>
      </div>

      <div className="relative grid w-full max-w-sm grid-cols-4 gap-2">
        {state.cards.map((card, index) => {
          const isFaceUp = card.matched || state.flipped.includes(index);
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleFlip(index)}
              disabled={isFaceUp}
              aria-label={isFaceUp ? card.symbol : "카드 뒤집기"}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg text-2xl transition-colors",
                isFaceUp ? "bg-primary/20" : "bg-muted hover:bg-muted-foreground/20"
              )}
            >
              {isFaceUp ? card.symbol : null}
            </button>
          );
        })}

        {state.status === "won" ? (
          <GameOverOverlay
            message="Complete!"
            score={computeScore(state.moves)}
            gameSlug={GAME_SLUG}
            onRetry={() => emitGameRetry(GAME_SLUG)}
            onRestart={() => dispatch({ type: "restart" })}
          />
        ) : null}

        {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}

        {phase === "resume-prompt" ? (
          <ResumeDialog
            gameTitle="Memory"
            onResume={onResume}
            onNewGame={onNewGame}
          />
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        카드를 두 장씩 뒤집어 같은 그림을 찾으세요.
      </p>
    </div>
  );
}
