"use client";

import {
  clearSave,
  emitGameRetry,
  getBestScore,
  loadGameProgress,
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
  GameFeelLayer,
  playGameFeel,
} from "@game-platform/game-sdk";
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import type { CSSProperties, TouchEvent } from "react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import { TILE_STAGES, tileStageIndex, tileStageLabel } from "./2048-stage-config";
import {
  addRandomTile,
  createInitialGrid,
  hasMovesAvailable,
  hasWon,
  maxTile,
  move,
  type Direction,
  type Grid,
} from "./engine";

const GAME_SLUG = "2048";
const SWIPE_THRESHOLD = 24;

type Status = "playing" | "won" | "over";

interface State {
  grid: Grid;
  score: number;
  best: number;
  bestTile: number;
  status: Status;
  winAcknowledged: boolean;
  tileStagesReached: number[];
  blockedPulse: number;
  mergePulse: number;
  mergeHighlight: number[];
}

type Action =
  | { type: "move"; direction: Direction }
  | { type: "restart" }
  | { type: "continue" };

function createInitialState(): State {
  const progress = loadGameProgress(GAME_SLUG);
  return {
    grid: createInitialGrid(),
    score: 0,
    best: Math.max(getBestScore(GAME_SLUG), progress.bestScore),
    bestTile: progress.bestTile,
    status: "playing",
    winAcknowledged: false,
    tileStagesReached: [],
    blockedPulse: 0,
    mergePulse: 0,
    mergeHighlight: [],
  };
}

function mergeHighlightIndices(before: Grid, after: Grid): number[] {
  const indices: number[] = [];
  for (let r = 0; r < before.length; r++) {
    for (let c = 0; c < before[r]!.length; c++) {
      const prev = before[r]![c]!;
      const next = after[r]![c]!;
      if (prev > 0 && next === prev * 2) {
        indices.push(r * before.length + c);
      }
    }
  }
  return indices;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "restart":
      return { ...createInitialState(), best: state.best, bestTile: state.bestTile };
    case "continue":
      return { ...state, status: "playing", winAcknowledged: true };
    case "move": {
      if (state.status === "over") {
        return state;
      }
      if (state.status === "won" && !state.winAcknowledged) {
        return state;
      }

      const result = move(state.grid, action.direction);
      if (!result.moved) {
        return { ...state, blockedPulse: state.blockedPulse + 1 };
      }

      const grid = addRandomTile(result.grid);
      const score = state.score + result.scoreGained;
      const best = Math.max(state.best, score);
      const tile = maxTile(grid);
      const bestTile = Math.max(state.bestTile, tile);
      const mergeHighlight = mergeHighlightIndices(state.grid, result.grid);

      let status: Status = "playing";
      if (!state.winAcknowledged && hasWon(grid)) {
        status = "won";
      } else if (!hasMovesAvailable(grid)) {
        status = "over";
      }

      const tileStagesReached = [...state.tileStagesReached];
      for (const milestone of TILE_STAGES) {
        if (tile >= milestone && !tileStagesReached.includes(milestone)) {
          tileStagesReached.push(milestone);
        }
      }

      return {
        grid,
        score,
        best,
        bestTile,
        status,
        winAcknowledged: state.winAcknowledged,
        tileStagesReached,
        blockedPulse: 0,
        mergePulse: state.mergePulse + (mergeHighlight.length > 0 ? 1 : 0),
        mergeHighlight,
      };
    }
    default:
      return state;
  }
}

const DIRECTION_KEYS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

export function Game2048() {
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
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const { reportScore } = useGameSDK();
  const gridRef = useRef<HTMLDivElement>(null);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    stageIndex: tileStageIndex(state.bestTile),
    score: state.score,
    muteScoreGain: true,
    fieldRef: gridRef,
  });
  const reportedTiles = useRef<Set<number>>(new Set());
  const prevScoreRef = useRef(0);
  const lastBlockedRef = useRef(0);

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () =>
      state.status === "playing" ||
      (state.status === "won" && state.winAcknowledged)
        ? state
        : null,
    [state]
  );

  useEffect(() => {
    for (const milestone of state.tileStagesReached) {
      if (!reportedTiles.current.has(milestone)) {
        reportedTiles.current.add(milestone);
        const stageIndex = TILE_STAGES.indexOf(milestone as (typeof TILE_STAGES)[number]) + 1;
        recordStageClear(stageIndex, state.score);
      }
    }
  }, [state.tileStagesReached, state.score, recordStageClear]);

  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      playGameFeel("merge", gridRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

  useEffect(() => {
    if (state.blockedPulse <= lastBlockedRef.current) return;
    lastBlockedRef.current = state.blockedPulse;
    playGameFeel("wrong", gridRef.current);
  }, [state.blockedPulse]);

  useEffect(() => {
    if (state.status === "over") {
      playGameFeel("wrong", gridRef.current);
    } else if (state.status === "won" && !state.winAcknowledged) {
      playGameFeel("goal", gridRef.current);
    }
  }, [state.status, state.winAcknowledged]);

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, state.score);
      recordGameEnd({
        score: state.score,
        outcome: "failure",
        bestTile: state.bestTile,
        stageReached: TILE_STAGES.filter((t) => state.bestTile >= t).length,
      });
      clearSave(GAME_SLUG);
    }
    if (state.status === "won" && !state.winAcknowledged) {
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, state.bestTile, state.winAcknowledged, reportScore, recordGameEnd]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!canPlayRef.current) {
        return;
      }
      const direction = DIRECTION_KEYS[event.key];
      if (!direction) {
        return;
      }
      event.preventDefault();
      dispatch({ type: "move", direction });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canPlayRef]);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      const start = touchStart.current;
      touchStart.current = null;
      if (!canPlayRef.current) {
        return;
      }
      const touch = event.changedTouches[0];
      if (!start || !touch) {
        return;
      }

      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;

      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) {
        return;
      }

      const direction: Direction =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? "right"
            : "left"
          : dy > 0
            ? "down"
            : "up";

      dispatch({ type: "move", direction });
    },
    [canPlayRef]
  );

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    resetSession();
    reportedTiles.current.clear();
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    resetSession();
    reportedTiles.current.clear();
    dispatch({ type: "restart" });
  }

  const showOverlay =
    state.status === "over" || (state.status === "won" && !state.winAcknowledged);

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="Score" value={state.score} />
          <ScoreBox label="Tile" value={state.bestTile || 2} />
          <ScoreBox label="Stage" value={tileStageIndex(state.bestTile)} />
          <ScoreBox label="Best" value={state.best} />
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={handleRetry}
        >
          <RotateCcw />
        </Button>
      </div>

      <div
        ref={gridRef}
        className="relative grid aspect-square w-full max-w-sm touch-none select-none grid-cols-4 gap-3 rounded-xl bg-muted p-3"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {state.grid.flat().map((value, index) => (
          <div
            key={`${index}-${value}-${state.mergePulse}`}
            className={cn(
              "flex items-center justify-center rounded-lg text-lg font-bold transition-transform duration-150 sm:text-2xl",
              value !== 0 &&
                state.mergeHighlight.includes(index) &&
                "game-effect-merge scale-110"
            )}
            style={tileStyle(value)}
          >
            {value !== 0 ? value : null}
          </div>
        ))}

        {showOverlay ? (
          <StandardGameOverOverlay
            message={state.status === "won" ? "You Win!" : "Game Over"}
            score={state.score}
            gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={feel.handleExit}
            onRetry={handleRetry}
            onRestart={handleRetry}
            onContinue={
              state.status === "won"
                ? () => dispatch({ type: "continue" })
                : undefined
            }
          />
        ) : null}

        {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}

        {phase === "resume-prompt" ? (
          <ResumeDialog
            gameTitle="2048"
            onResume={onResume}
            onNewGame={handleNewGame}
          />
        ) : null}

        <GameFeelLayer bursts={feel.bursts} />
      </div>

      <p className="text-xs text-muted-foreground">
        목표: {tileStageLabel(state.bestTile)} → 다음{" "}
        {TILE_STAGES[tileStageIndex(state.bestTile)] ?? 2048} · 방향키 또는 스와이프
      </p>
    </div>
  );
}

function tileStyle(value: number): CSSProperties {
  if (value === 0) {
    return {};
  }
  const exponent = Math.log2(value);
  const intensity = Math.min(100, exponent * 9);
  return {
    backgroundColor: `color-mix(in oklch, var(--primary) ${intensity}%, var(--muted))`,
    color: intensity > 50 ? "var(--primary-foreground)" : "var(--foreground)",
  };
}
