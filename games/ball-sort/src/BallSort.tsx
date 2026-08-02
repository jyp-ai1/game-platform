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
  useStandardGameFeel,
} from "@game-platform/game-sdk";
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import { getBallSortStage } from "./ball-sort-stage-config";
import {
  advanceStage,
  computeScore,
  createInitialState,
  tapTube,
  type BallId,
  type BallSortState,
} from "./engine";
import {
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "ball-sort";
const LABELS: Record<BallId, string> = {
  1: "🔴",
  2: "🔵",
  3: "🟢",
  4: "🟡",
  5: "🟣",
};

type Action = { type: "tap"; index: number } | { type: "restart" } | { type: "nextStage" };

function reducer(state: BallSortState, action: Action): BallSortState {
  if (action.type === "restart") return createInitialState();
  if (action.type === "nextStage") return advanceStage(state);
  return tapTube(state, action.index);
}

export function BallSortGame() {
  const { phase, initialState, onResume, onNewGame } =
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
  const stageDef = getBallSortStage(state.stageIndex);
  const score = computeScore(state.moves, state.stageIndex);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...feelWithScore(state as unknown as Record<string, unknown>, score),
    stageIndex: state.stageIndex,
    fieldRef,
  });

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "stage-clear" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status === "won" && prevStatusRef.current !== "won") {
      playStageClearAudio();
      const id = window.setTimeout(() => dispatch({ type: "nextStage" }), 1400);
      return () => window.clearTimeout(id);
    }
    if (state.status === "stage-clear" && prevStatusRef.current !== "stage-clear") {
      playStageClearAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    if (state.status === "stage-clear") {
      reportScore(GAME_SLUG, score);
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, score, reportScore]);

  const prevMovesRef = useRef(0);
  useEffect(() => {
    if (state.moves > prevMovesRef.current && state.status === "playing") {
      playGameFeel(state.lastMovedCount > 1 ? "combo" : "pop", fieldRef.current);
    }
    prevMovesRef.current = state.moves;
  }, [state.moves, state.status, state.lastMovedCount]);

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
    <div className="standard-game-shell relative mx-auto flex w-full flex-col items-center gap-4 max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Stage" value={stageDef.label} />
        <ScoreBox label="Moves" value={state.moves} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <PuzzlePlayField fieldRef={fieldRef} bursts={feel.bursts} className="touch-none">
        <div className="flex w-full justify-center gap-1 sm:gap-2">
          {state.tubes.map((tube, ti) => (
            <button
              key={ti}
              type="button"
              onClick={() => {
                if (canPlayRef.current) {
                  primeGameAudio();
                  playGameFeel("button", fieldRef.current);
                  dispatch({ type: "tap", index: ti });
                }
              }}
              className={cn(
                "flex h-32 min-h-11 w-10 min-w-10 flex-col-reverse items-center rounded-b-full border-2 border-foreground/20 bg-muted/30 transition-transform duration-150 active:scale-95 sm:h-36 sm:w-11",
                state.selected === ti && "ring-2 ring-primary scale-105"
              )}
              aria-label={`튜브 ${ti + 1}`}
            >
              {tube.map((b, bi) => (
                <span key={bi} className="text-base leading-none sm:text-lg">
                  {LABELS[b]}
                </span>
              ))}
            </button>
          ))}
        </div>
      </PuzzlePlayField>
      {state.lastMovedCount > 1 && state.status === "playing" ? (
        <p className="text-xs font-medium text-primary">×{state.lastMovedCount} moved!</p>
      ) : null}
      {state.status === "stage-clear" ? (
        <StandardGameOverOverlay
          message="All stages complete!"
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
        <ResumeDialog gameTitle="Ball Sort" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">같은 색 공을 한 튜브에 — 여러 개 한번에 이동 가능.</p>
    </div>
  );
}
