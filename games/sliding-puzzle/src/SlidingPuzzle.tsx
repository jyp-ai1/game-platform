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
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  computeScore,
  createInitialState,
  tapTile,
  type SlidingDifficulty,
  type SlidingPuzzleState,
} from "./engine";
import {
  SLIDING_DIFFICULTIES,
  difficultyLabel,
} from "./sliding-stage-config";
import {
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "sliding-puzzle";
const PUZZLE_FIELD_CLASS = "touch-none max-w-[min(100%,20.5rem)]";
const STAGE_BY_DIFFICULTY: Record<SlidingDifficulty, number> = { EASY: 1, MEDIUM: 2, HARD: 3 };

type Action = { type: "tap"; index: number } | { type: "restart"; difficulty?: SlidingDifficulty };

function reducer(state: SlidingPuzzleState, action: Action): SlidingPuzzleState {
  if (action.type === "restart") return createInitialState(action.difficulty ?? state.difficulty);
  return tapTile(state, action.index);
}

export function SlidingPuzzleGame() {
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
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const score = computeScore(state.moves, state.size);
  const stageIndex = STAGE_BY_DIFFICULTY[state.difficulty];
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...feelWithScore(state as unknown as Record<string, unknown>, score),
    stageIndex,
    fieldRef,
  });
  const saveStatus = useAutoSave(GAME_SLUG, () => (state.status === "won" ? null : state), [state]);

  const prevMovesRef = useRef(0);
  const prevStatusRef = useRef(state.status);
  useEffect(() => {
    if (state.moves > prevMovesRef.current && state.status === "playing") {
      playGameFeel("pop", fieldRef.current);
    }
    prevMovesRef.current = state.moves;
  }, [state.moves, state.status]);

  useEffect(() => {
    if (state.status === "won" && prevStatusRef.current !== "won") {
      playStageClearAudio();
      playGameFeel("goal", fieldRef.current);
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
  }, [state.status, state.moves, score, reportScore, recordGameEnd]);

  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry(difficulty?: SlidingDifficulty) {
    emitGameRetry(GAME_SLUG);
    resetSession();
    resetGameAudioPrime();
    dispatch({ type: "restart", difficulty });
  }

  function handleNewGame() {
    onNewGame();
    resetSession();
    resetGameAudioPrime();
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-3 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <ScoreBox label="Stage" value={stageIndex} />
          <ScoreBox label="Moves" value={state.moves} />
          <ScoreBox label="Score" value={score} />
          <ScoreBox label="Best" value={feel.bestScore} />
        </div>
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => handleRetry()}>
          <RotateCcw />
        </Button>
      </div>
      <div className="flex w-full max-w-sm flex-wrap gap-1">
        {SLIDING_DIFFICULTIES.map((level) => (
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
      <PuzzlePlayField fieldRef={fieldRef} bursts={feel.bursts} className={PUZZLE_FIELD_CLASS}>
        <div
          className="grid w-full gap-1 rounded-xl bg-muted p-2"
          style={{ gridTemplateColumns: `repeat(${state.size}, 1fr)` }}
        >
          {state.tiles.map((tile, i) => (
            <button
              key={i}
              type="button"
              disabled={tile === 0}
              onClick={() => {
                if (canPlayRef.current) {
                  primeGameAudio();
                  playGameFeel("button", fieldRef.current);
                  dispatch({ type: "tap", index: i });
                }
              }}
              className={cn(
                "flex aspect-square min-h-11 min-w-11 items-center justify-center rounded-lg text-lg font-bold transition-transform duration-150 active:scale-95",
                tile ? "bg-primary text-primary-foreground" : "bg-transparent"
              )}
            >
              {tile || ""}
            </button>
          ))}
        </div>
      </PuzzlePlayField>
      {state.status === "won" ? (
        <StandardGameOverOverlay
          message={`${state.size * state.size - 1}-Puzzle Complete! ${score} pts (${state.moves} moves)`}
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
        <ResumeDialog gameTitle="Sliding Puzzle" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">
        빈 칸 옆 타일을 탭해 순서대로 맞추세요.
      </p>
    </div>
  );
}
