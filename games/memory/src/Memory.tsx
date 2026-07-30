"use client";

import {
  clearSave,
  ResumeDialog,
  SaveIndicator,
  StandardGameOverOverlay,
  useAutoSave,
  useGameSDK,
  useGameSession,
  useReadyCountdown,
  useResumableGame,
  standardFeelFromState,
  useStandardGameFeel,
  feelWithScore,
  PuzzlePlayField,
  playGameFeel,
} from "@game-platform/game-sdk";
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useEffect, useReducer, useRef } from "react";

import { computeScore, createShuffledCards, type Card } from "./engine";
import {
  FINAL_MEMORY_STAGE,
  getMemoryStage,
  type MemoryStageDef,
} from "./memory-stage-config";

const GAME_SLUG = "memory";
const MISMATCH_DELAY_MS = 800;

interface State {
  stageIndex: number;
  stage: MemoryStageDef;
  cards: Card[];
  flipped: number[];
  moves: number;
  status: "playing" | "stage-clear" | "won";
}

type Action =
  | { type: "flip"; index: number }
  | { type: "resolve" }
  | { type: "restart" }
  | { type: "nextStage" };

function buildStageState(stageIndex: number): State {
  const stage = getMemoryStage(stageIndex);
  return {
    stageIndex,
    stage,
    cards: createShuffledCards(stage.pairs),
    flipped: [],
    moves: 0,
    status: "playing",
  };
}

function createInitialState(): State {
  return buildStageState(1);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "nextStage":
      if (state.stageIndex >= FINAL_MEMORY_STAGE) {
        return { ...state, status: "won" };
      }
      return buildStageState(state.stageIndex + 1);
    case "resolve":
      return { ...state, flipped: [] };
    case "flip": {
      if (state.status !== "playing" || state.flipped.length >= 2) {
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
        const allMatched = cards.every((c) => c.matched);
        return {
          ...state,
          cards,
          flipped: [],
          moves,
          status: allMatched
            ? state.stageIndex >= FINAL_MEMORY_STAGE
              ? "won"
              : "stage-clear"
            : "playing",
        };
      }

      return { ...state, flipped, moves };
    }
    default:
      return state;
  }
}

export function MemoryGame() {
  const { phase, initialState, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const sessionActive = phase === "ready" && !showCountdown;
  const { recordStageClear, recordGameEnd, resetSession } =
    useGameSession(GAME_SLUG, sessionActive);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const score = computeScore(state.moves, state.stageIndex);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...feelWithScore(state as unknown as Record<string, unknown>, score),
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageClearReported = useRef(false);
  const prevMatchedRef = useRef(0);

  useEffect(() => {
    const matched = state.cards.filter((c) => c.matched).length;
    if (matched > prevMatchedRef.current) {
      playGameFeel("match");
    }
    prevMatchedRef.current = matched;
  }, [state.cards]);

  useEffect(() => {
    if (state.flipped.length !== 2) {
      return;
    }
    const [firstIndex, secondIndex] = state.flipped as [number, number];
    const first = state.cards[firstIndex];
    const second = state.cards[secondIndex];
    if (first && second && first.symbol !== second.symbol) {
      playGameFeel("wrong");
    }
  }, [state.flipped, state.cards]);

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "playing" ? state : null),
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
    if (state.status === "stage-clear" && !stageClearReported.current) {
      stageClearReported.current = true;
      const score = computeScore(state.moves, state.stageIndex);
      recordStageClear(state.stageIndex, score);
      reportScore(GAME_SLUG, score);
      clearSave(GAME_SLUG);
    }
    if (state.status === "playing") {
      stageClearReported.current = false;
    }
  }, [state.status, state.moves, state.stageIndex, recordStageClear, reportScore]);

  useEffect(() => {
    if (state.status === "won") {
      const score = computeScore(state.moves, state.stageIndex);
      reportScore(GAME_SLUG, score);
      recordGameEnd({
        score,
        outcome: "clear",
        stageReached: state.stageIndex,
      });
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.moves, state.stageIndex, reportScore, recordGameEnd]);

  function handleFlip(index: number) {
    if (!canPlayRef.current) {
      return;
    }
    playGameFeel("flip");
    dispatch({ type: "flip", index });
  }

  function handleRetry() {
    resetSession();
    dispatch({ type: "restart" });
  }

  const gridColsClass =
    state.stage.cols === 6
      ? "grid-cols-6"
      : state.stage.cols === 5
        ? "grid-cols-5"
        : "grid-cols-4";

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="Stage" value={state.stageIndex} />
          <ScoreBox label="Moves" value={state.moves} />
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={() => dispatch({ type: "restart" })}
        >
          <RotateCcw />
        </Button>
      </div>

      <PuzzlePlayField bursts={feel.bursts}>
      <div className={cn("relative grid w-full gap-2", gridColsClass)}>
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
                "flex aspect-square items-center justify-center rounded-lg text-2xl transition-all duration-200",
                isFaceUp ? "scale-100 bg-primary/20" : "scale-95 bg-muted hover:scale-100 hover:bg-muted-foreground/20"
              )}
            >
              {isFaceUp ? card.symbol : null}
            </button>
          );
        })}

        {state.status === "stage-clear" ? (
          <StandardGameOverOverlay
            variant="stage-clear"
            stageLabel={`Stage ${state.stageIndex} Clear`}
            score={score}
            gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={feel.handleExit}
            onRetry={handleRetry}
            onRestart={handleRetry}
            onNextStage={() => dispatch({ type: "nextStage" })}
          />
        ) : null}

        {state.status === "won" ? (
          <StandardGameOverOverlay
            message="Complete!"
            score={score}
            gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={feel.handleExit}
            onRetry={handleRetry}
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
      </PuzzlePlayField>

      <p className="text-xs text-muted-foreground">
        카드를 두 장씩 뒤집어 같은 그림을 찾으세요.
      </p>
    </div>
  );
}
