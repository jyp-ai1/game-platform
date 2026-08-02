"use client";

import {
  clearSave,
  emitGameRetry,
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
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  COMBO_BONUS,
  computeScore,
  computeStageScore,
  createShuffledCards,
  type Card,
} from "./engine";
import {
  playComboAudio,
  playMatchAudio,
  playStageClearAudio,
  playWrongAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";
import {
  FINAL_MEMORY_STAGE,
  getMemoryStage,
  type MemoryStageDef,
} from "./memory-stage-config";

const GAME_SLUG = "memory";
const MISMATCH_DELAY_MS = 800;
const PUZZLE_FIELD_CLASS = "touch-none max-w-[min(100%,20.5rem)]";

interface State {
  stageIndex: number;
  stage: MemoryStageDef;
  cards: Card[];
  flipped: number[];
  moves: number;
  mismatches: number;
  comboStreak: number;
  comboPeak: number;
  totalScore: number;
  status: "playing" | "stage-clear" | "won";
}

type Action =
  | { type: "flip"; index: number }
  | { type: "resolve" }
  | { type: "restart" }
  | { type: "nextStage" };

function buildStageState(stageIndex: number, totalScore = 0): State {
  const stage = getMemoryStage(stageIndex);
  return {
    stageIndex,
    stage,
    cards: createShuffledCards(stage.pairs),
    flipped: [],
    moves: 0,
    mismatches: 0,
    comboStreak: 0,
    comboPeak: 0,
    totalScore,
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
      return buildStageState(state.stageIndex + 1, state.totalScore);
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
        const comboStreak = state.comboStreak + 1;
        const comboPeak = Math.max(state.comboPeak, comboStreak);
        const stageScore = allMatched
          ? computeStageScore(
              moves,
              state.stageIndex,
              comboPeak,
              state.mismatches === 0
            )
          : 0;
        return {
          ...state,
          cards,
          flipped: [],
          moves,
          comboStreak,
          comboPeak,
          totalScore: allMatched ? state.totalScore + stageScore : state.totalScore,
          status: allMatched
            ? state.stageIndex >= FINAL_MEMORY_STAGE
              ? "won"
              : "stage-clear"
            : "playing",
        };
      }

      return {
        ...state,
        flipped,
        moves,
        mismatches: state.mismatches + 1,
        comboStreak: 0,
      };
    }
    default:
      return state;
  }
}

export function MemoryGame() {
  const { phase, initialState, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

  const sessionActive = phase === "ready" && !showCountdown;
  const { recordStageClear, recordGameEnd, resetSession } =
    useGameSession(GAME_SLUG, sessionActive);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const score =
    state.status === "playing"
      ? state.totalScore +
        computeScore(state.moves, state.stageIndex) +
        Math.max(0, state.comboStreak - 1) * COMBO_BONUS
      : state.totalScore;
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...feelWithScore(state as unknown as Record<string, unknown>, score),
    stageIndex: state.stageIndex,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageClearReported = useRef(false);
  const prevMatchedRef = useRef(0);
  const prevStatusRef = useRef(state.status);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [sparkIndices, setSparkIndices] = useState<number[]>([]);

  useEffect(() => {
    const matched = state.cards.filter((c) => c.matched).length;
    if (matched > prevMatchedRef.current) {
      const newlyMatched = state.cards
        .map((c, i) => (c.matched ? i : -1))
        .filter((i) => i >= 0)
        .slice(-2);
      setSparkIndices(newlyMatched);
      window.setTimeout(() => setSparkIndices([]), 450);
      if (state.comboStreak >= 3) {
        playComboAudio();
      } else {
        playMatchAudio();
      }
      playGameFeel(state.comboStreak >= 3 ? "combo" : "match");
    }
    prevMatchedRef.current = matched;
  }, [state.cards, state.comboStreak]);

  useEffect(() => {
    if (state.flipped.length !== 2) {
      return;
    }
    const [firstIndex, secondIndex] = state.flipped as [number, number];
    const first = state.cards[firstIndex];
    const second = state.cards[secondIndex];
    if (first && second && first.symbol !== second.symbol) {
      playWrongAudio();
      playGameFeel("wrong");
      setWrongFlash(true);
      window.setTimeout(() => setWrongFlash(false), 400);
    }
  }, [state.flipped, state.cards]);

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () =>
      state.status === "playing" || state.status === "stage-clear"
        ? state
        : null,
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
      playStageClearAudio();
      recordStageClear(state.stageIndex, state.totalScore);
      reportScore(GAME_SLUG, state.totalScore);
    }
    if (state.status === "playing") {
      stageClearReported.current = false;
    }
  }, [state.status, state.moves, state.stageIndex, recordStageClear, reportScore]);

  useEffect(() => {
    if (state.status === "won" && prevStatusRef.current !== "won") {
      playStageClearAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    if (state.status === "won") {
      reportScore(GAME_SLUG, state.totalScore);
      recordGameEnd({
        score: state.totalScore,
        outcome: "clear",
        stageReached: state.stageIndex,
      });
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, state.moves, state.stageIndex, reportScore, recordGameEnd]);

  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleFlip(index: number) {
    if (!canPlayRef.current || state.status !== "playing") {
      return;
    }
    primeGameAudio();
    if (state.flipped.length === 0) {
      playGameFeel("flip");
    }
    dispatch({ type: "flip", index });
  }

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    resetSession();
    resetGameAudioPrime();
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    resetSession();
    resetGameAudioPrime();
    dispatch({ type: "restart" });
  }

  const gridColsClass =
    state.stage.cols === 6
      ? "grid-cols-6"
      : state.stage.cols === 5
        ? "grid-cols-5"
        : "grid-cols-4";

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-3 sm:px-0 landscape:gap-2 max-h-[700px]:gap-2 max-h-[520px]:gap-1 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <ScoreBox label="Score" value={score} />
          <ScoreBox label="Round" value={`${state.stageIndex}/${FINAL_MEMORY_STAGE}`} />
          <ScoreBox label="Best" value={feel.bestScore} />
          <ScoreBox label="Best Stage" value={feel.bestStage} />
          <ScoreBox label="Combo" value={state.comboStreak} />
          <ScoreBox label="Moves" value={state.moves} />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="min-h-11 min-w-11 shrink-0"
          aria-label="새 게임"
          onClick={handleRetry}
        >
          <RotateCcw />
        </Button>
      </div>

      <p className="text-sm font-medium text-muted-foreground">
        Round {state.stageIndex} — {state.stage.label} ({state.stage.pairs} pairs)
      </p>

      <PuzzlePlayField bursts={feel.bursts} className={PUZZLE_FIELD_CLASS}>
      <div
        className={cn(
          "relative grid w-full gap-2 max-h-[520px]:gap-1 landscape:max-h-[55vh] landscape:overflow-y-auto",
          gridColsClass,
          wrongFlash && "animate-[shake_0.35s_ease-in-out]"
        )}
      >
        {state.cards.map((card, index) => {
          const isFaceUp = card.matched || state.flipped.includes(index);
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleFlip(index)}
              disabled={isFaceUp || card.matched}
              aria-label={isFaceUp ? card.symbol : "카드 뒤집기"}
              className="aspect-square min-h-11"
            >
              <span
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center rounded-lg border-2 text-2xl font-bold shadow-md transition-all duration-200",
                  isFaceUp
                    ? "border-primary/50 bg-primary/15 text-foreground"
                    : "border-indigo-400/60 bg-gradient-to-br from-indigo-700 via-violet-700 to-indigo-900 text-white shadow-indigo-900/40 hover:brightness-110",
                  card.matched && "ring-2 ring-primary/50 opacity-80",
                  sparkIndices.includes(index) && "ring-4 ring-amber-400/80 scale-105 animate-[pulse_0.4s_ease-out]"
                )}
              >
                {isFaceUp ? (
                  card.symbol
                ) : (
                  <>
                    <span className="text-base leading-none opacity-90" aria-hidden>
                      🎴
                    </span>
                    <span className="mt-0.5 text-sm font-black tracking-widest">?</span>
                  </>
                )}
              </span>
            </button>
          );
        })}

        {state.status === "stage-clear" ? (
          <StandardGameOverOverlay
            message={
              state.mismatches === 0
                ? `Round ${state.stageIndex} Clear — Perfect!`
                : `Round ${state.stageIndex} Clear`
            }
            score={score}
            gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={handleExit}
            onRetry={handleRetry}
            onRestart={handleRetry}
            onContinue={() => dispatch({ type: "nextStage" })}
          />
        ) : null}

        {state.status === "won" ? (
          <StandardGameOverOverlay
            message="Complete!"
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
      </div>
      </PuzzlePlayField>

      {phase === "resume-prompt" ? (
        <ResumeDialog
          gameTitle="Memory"
          onResume={onResume}
          onNewGame={handleNewGame}
        />
      ) : null}

      <p className="text-xs text-muted-foreground">
        카드를 두 장씩 뒤집어 같은 그림을 찾으세요.
      </p>
    </div>
  );
}
