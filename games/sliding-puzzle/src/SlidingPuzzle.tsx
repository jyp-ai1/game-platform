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
  useReadyCountdown,
  useResumableGame,
  standardFeelFromState,
  useStandardGameFeel,
} from "@game-platform/game-sdk";
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import { computeScore, createInitialState, tapTile, type SlidingPuzzleState } from "./engine";
import {
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "sliding-puzzle";

type Action = { type: "tap"; index: number } | { type: "restart" };

function reducer(state: SlidingPuzzleState, action: Action): SlidingPuzzleState {
  if (action.type === "restart") return createInitialState();
  return tapTile(state, action.index);
}

export function SlidingPuzzleGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const score = computeScore(state.moves);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...feelWithScore(state as unknown as Record<string, unknown>, score),
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
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    if (state.status === "won") {
      reportScore(GAME_SLUG, computeScore(state.moves));
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, state.moves, reportScore]);

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
      <div className="flex w-full max-w-sm justify-between">
        <ScoreBox label="Moves" value={state.moves} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <PuzzlePlayField fieldRef={fieldRef} bursts={feel.bursts} className="touch-none">
      <div className="grid w-full grid-cols-4 gap-1 rounded-xl bg-muted p-2">
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
          message={`15-Puzzle Complete! ${computeScore(state.moves)} pts (${state.moves} moves)`}
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
        15-puzzle: 빈 칸 옆 타일을 탭해 1~15 순서로 맞추세요.
      </p>
    </div>
  );
}
