"use client";

import {
  clearSave,
  emitGameRetry,
  getGroupDifficulty,
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
import type { TouchEvent } from "react";
import { useEffect, useCallback, useReducer, useRef } from "react";

import {
  COLS,
  createInitialState,
  ROWS,
  setQueuedDirection,
  step,
  type Direction,
  type MazeState,
} from "./engine";
import {
  playGameOverAudio,
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "maze-runner";
const TICK_MS = 130;
const SWIPE_THRESHOLD = 24;

type Action =
  | { type: "tick"; dt: number }
  | { type: "setDirection"; direction: Direction }
  | { type: "restart" };

function reducer(state: MazeState, action: Action): MazeState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "setDirection":
      return setQueuedDirection(state, action.direction);
    case "tick":
      return step(state, action.dt);
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

const CHASER_COLORS = ["bg-destructive", "bg-secondary-foreground", "bg-accent-foreground"];

export function MazeRunnerGame() {
  const { phase, initialState, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const prevScoreRef = useRef(0);
  const prevStatusRef = useRef(state.status);
  
  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      playGameFeel("goal", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    stageIndex: Math.floor(state.score / 200) + 1,
    fieldRef,
  });

  const diff = getGroupDifficulty(GAME_SLUG, Math.floor(state.score / 200) + 1);
  const tickMs = Math.max(80, TICK_MS / diff.speedMult);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status !== "playing" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status !== "playing" || !canPlay) {
      return;
    }
    const id = setInterval(() => dispatch({ type: "tick", dt: tickMs / 1000 }), tickMs);
    return () => clearInterval(id);
  }, [state.status, canPlay, tickMs]);

  useEffect(() => {
    if (state.status === prevStatusRef.current) {
      return;
    }
    if (state.status === "over") {
      playGameOverAudio();
    } else if (state.status === "won") {
      playStageClearAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    if (state.status === "over" || state.status === "won") {
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, state.score, reportScore]);

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
      primeGameAudio();
      playGameFeel("button", fieldRef.current);
      dispatch({ type: "setDirection", direction });
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canPlayRef]);

  function handleTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: TouchEvent) {
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
    primeGameAudio();
    dispatch({ type: "setDirection", direction });
  }


  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    resetGameAudioPrime();
    prevScoreRef.current = 0;
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    resetGameAudioPrime();
    prevScoreRef.current = 0;
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="Dots" value={state.dotsRemaining} />
          <ScoreBox label="Score" value={state.score} />
          <ScoreBox label="Lives" value={state.lives} />
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
        className="relative grid w-full max-w-sm touch-none select-none gap-0 rounded-xl bg-muted p-1 transition-transform duration-150"
        ref={fieldRef}
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          aspectRatio: `${COLS} / ${ROWS}`,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {state.grid.map((row, y) =>
          row.map((cell, x) => {
            const isPlayer = state.playerX === x && state.playerY === y;
            const chaser = state.chasers.find((c) => c.x === x && c.y === y);
            return (
              <div
                key={`${x},${y}`}
                className={cn("relative flex items-center justify-center", cell === "wall" && "bg-primary/20 rounded-[2px]")}
              >
                {cell === "dot" ? (
                  <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                ) : null}
                {cell === "power" ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                ) : null}
                {chaser ? (
                  <span
                    className={cn(
                      "absolute inset-[15%] rounded-full",
                      chaser.mode === "frightened"
                        ? "bg-accent"
                        : CHASER_COLORS[chaser.id % CHASER_COLORS.length]
                    )}
                  />
                ) : null}
                {isPlayer ? (
                  <span className="absolute inset-[10%] rounded-full bg-primary" />
                ) : null}
              </div>
            );
          })
        )}

        {state.status !== "playing" ? (
          <StandardGameOverOverlay
            message={state.status === "won" ? "You Win!" : "Game Over"}
            score={state.score}
            gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={handleExit}
            onRetry={handleRetry}
            onRestart={handleRetry}
          />
        ) : null}

        {phase === "resume-prompt" ? (
          <ResumeDialog
            gameTitle="Maze Runner"
            onResume={onResume}
            onNewGame={handleNewGame}
          />
        ) : null}

        {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}

        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}
      </div>

      <p className="text-xs text-muted-foreground">
        방향키 또는 스와이프로 이동하세요. 파워 펠릿을 먹으면 잠시 추격자를 역으로 공격할 수 있습니다.
      </p>
    </div>
  );
}
