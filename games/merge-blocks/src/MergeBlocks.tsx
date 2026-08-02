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
  standardFeelFromState,
  useStandardGameFeel,
} from "@game-platform/game-sdk";
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { createInitialState, dropColumn, type MergeBlocksState } from "./engine";
import {
  playGameOverAudio,
  playMergeAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "merge-blocks";
const PUZZLE_FIELD_CLASS = "touch-none max-w-[min(100%,20.5rem)]";

function highestBlock(grid: number[][]): number {
  return grid.reduce((max, row) => Math.max(max, ...row), 0);
}

function stageFromGrid(grid: number[][]): number {
  const peak = highestBlock(grid);
  return Math.max(1, Math.floor(Math.log2(Math.max(2, peak))));
}

type Action = { type: "drop"; col: number } | { type: "restart" };

function reducer(state: MergeBlocksState, action: Action): MergeBlocksState {
  if (action.type === "restart") return createInitialState();
  return dropColumn(state, action.col);
}

export function MergeBlocksGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
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
  const prevScoreRef = useRef(0);
  const prevStatusRef = useRef(state.status);
  const [mergeFlash, setMergeFlash] = useState(false);
  const stageIndex = stageFromGrid(state.grid);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...feelWithScore(state as unknown as Record<string, unknown>, state.score),
    stageIndex,
    fieldRef,
    muteScoreGain: true,
  });

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "over" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status === "over" && prevStatusRef.current !== "over") {
      playGameOverAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, state.score);
      recordGameEnd({ score: state.score, outcome: "failure" });
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, state.score, reportScore, recordGameEnd]);

  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      const gain = state.score - prevScoreRef.current;
      if (gain > 0) {
        playMergeAudio();
        setMergeFlash(true);
        window.setTimeout(() => setMergeFlash(false), 350);
      }
      playGameFeel(gain >= 20 ? "combo" : "merge", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    resetSession();
    resetGameAudioPrime();
    prevScoreRef.current = 0;
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    resetSession();
    resetGameAudioPrime();
    prevScoreRef.current = 0;
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-3 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Stage" value={stageIndex} />
        <ScoreBox label="Score" value={state.score} />
        <ScoreBox label="Best" value={feel.bestScore} />
        <ScoreBox label="Next" value={state.next} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <PuzzlePlayField fieldRef={fieldRef} bursts={feel.bursts} className={PUZZLE_FIELD_CLASS}>
      <div className="grid w-full grid-cols-4 gap-1 rounded-xl bg-muted p-2">
        {state.grid.map((row, ri) =>
          row.map((cell, ci) => (
            <button
              key={`${ri}-${ci}-${cell}`}
              type="button"
              onClick={() => {
                if (canPlayRef.current && state.status === "playing") {
                  primeGameAudio();
                  playGameFeel("button", fieldRef.current);
                  dispatch({ type: "drop", col: ci });
                }
              }}
              className={cn(
                "flex aspect-square min-h-11 min-w-11 items-center justify-center rounded text-sm font-bold transition-transform duration-150 active:scale-95",
                cell ? "bg-primary/80 text-primary-foreground" : "bg-background/50",
                cell > 0 && mergeFlash && "game-effect-merge scale-110 animate-[bounce_0.35s_ease-out]"
              )}
            >
              {cell || ""}
            </button>
          ))
        )}
      </div>
      </PuzzlePlayField>
      {state.status === "over" ? (
        <StandardGameOverOverlay
          message={`Score ${state.score}`}
          score={state.score}
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
        <ResumeDialog gameTitle="Merge Blocks" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">열을 탭해 블록을 떨어뜨리고 합치세요.</p>
    </div>
  );
}
