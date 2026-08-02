"use client";

import {
  clearSave,
  emitGameRetry,
  ResumeDialog,
  SaveIndicator,
  StandardGameOverOverlay,
  useAutoSave,
  useGameSDK,
  useReadyCountdown,
  useResumableGame,
  getGroupDifficulty,
  standardFeelFromState,
  useStandardGameFeel,
  playGameFeel,
  GameFeelLayer,
} from "@game-platform/game-sdk";
import { Button, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import type { CSSProperties, PointerEvent } from "react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  BALL_SIZE,
  advanceStage,
  brickRect,
  brickRowColor,
  createInitialState,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  launchBall,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_Y,
  step,
  type BreakoutState,
  type Rect,
} from "./engine";
import { playGameOverAudio, playStageClearAudio, primeGameAudio, resetGameAudioPrime } from "./game-audio-prime";

const GAME_SLUG = "breakout";
const PLAY_FIELD_CLASS =
  "relative w-full max-w-[min(100%,20.5rem)] touch-none select-none overflow-hidden rounded-xl bg-muted transition-transform duration-150 active:scale-[0.99]";
const PADDLE_KEY_SPEED = 320;
const MAX_DT = 0.05;

type Action =
  | { type: "step"; dt: number }
  | { type: "setPaddleX"; x: number }
  | { type: "advanceStage" }
  | { type: "launchBall" }
  | { type: "restart" };

function reducer(state: BreakoutState, action: Action): BreakoutState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "advanceStage":
      return advanceStage(state);
    case "launchBall":
      return launchBall(state);
    case "setPaddleX":
      return {
        ...state,
        paddleX: Math.max(0, Math.min(FIELD_WIDTH - PADDLE_WIDTH, action.x)),
      };
    case "step":
      return step(state, action.dt);
    default:
      return state;
  }
}

function toPercentRect(rect: Rect): CSSProperties {
  return {
    left: `${(rect.x / FIELD_WIDTH) * 100}%`,
    top: `${(rect.y / FIELD_HEIGHT) * 100}%`,
    width: `${(rect.width / FIELD_WIDTH) * 100}%`,
    height: `${(rect.height / FIELD_HEIGHT) * 100}%`,
  };
}

export function BreakoutGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
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
  const prevScoreRef = useRef(0);
  const prevStatusRef = useRef(state.status);
  
  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      const gain = state.score - prevScoreRef.current;
      playGameFeel(gain >= 25 ? "combo" : "explosion", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

  useEffect(() => {
    if (state.status !== "playing" && prevStatusRef.current === "playing") {
      if (state.status === "won" || state.status === "stage-clear") {
        playStageClearAudio();
      } else {
        playGameOverAudio();
      }
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  const stageIndex = state.stage;
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    stageIndex,
    muteScoreGain: true,
    fieldRef,
  });
  const diff = getGroupDifficulty(GAME_SLUG, stageIndex);
  const keysRef = useRef<Set<string>>(new Set());
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "playing" ? state : null),
    [state]
  );

  useEffect(() => {
    function loop(time: number) {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }
      const dt = Math.min(MAX_DT, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;

      // Keep the rAF chain alive while gated (Resume Dialog showing) so
      // ticking resumes immediately once it's dismissed, without dispatching
      // in the meantime.
      if (canPlayRef.current && stateRef.current.status === "playing") {
        let dx = 0;
        if (keysRef.current.has("ArrowLeft")) {
          dx -= 1;
        }
        if (keysRef.current.has("ArrowRight")) {
          dx += 1;
        }
        if (dx !== 0) {
          dispatch({
            type: "setPaddleX",
            x: stateRef.current.paddleX + dx * PADDLE_KEY_SPEED * dt,
          });
        }
        dispatch({ type: "step", dt: dt * diff.speedMult });
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [canPlayRef, diff.speedMult]);

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
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        primeGameAudio();
        playGameFeel("button", fieldRef.current);
        dispatch({ type: "launchBall" });
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        primeGameAudio();
        keysRef.current.add(event.key);
      }
    }
    function handleKeyUp(event: KeyboardEvent) {
      keysRef.current.delete(event.key);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const updatePaddleFromPointer = useCallback(
    (clientX: number) => {
      if (!canPlayRef.current) {
        return;
      }
      primeGameAudio();
      const field = fieldRef.current;
      if (!field) {
        return;
      }
      const rect = field.getBoundingClientRect();
      const relativeX =
        ((clientX - rect.left) / rect.width) * FIELD_WIDTH;
      dispatch({ type: "setPaddleX", x: relativeX - PADDLE_WIDTH / 2 });
    },
    [canPlayRef]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      updatePaddleFromPointer(event.clientX);
    },
    [updatePaddleFromPointer]
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      playGameFeel("button", fieldRef.current);
      if (stateRef.current.ballAttached && stateRef.current.status === "playing") {
        primeGameAudio();
        dispatch({ type: "launchBall" });
        return;
      }
      updatePaddleFromPointer(event.clientX);
    },
    [updatePaddleFromPointer]
  );

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
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-3 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <ScoreBox label="Score" value={state.score} />
          <ScoreBox label="Stage" value={stageIndex} />
          <ScoreBox label="Lives" value={state.lives} />
          <ScoreBox label="Best" value={feel.bestScore} />
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

      <div
        ref={fieldRef}
        className={PLAY_FIELD_CLASS}
        style={{ aspectRatio: `${FIELD_WIDTH} / ${FIELD_HEIGHT}` }}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
      >
        {state.bricks.map((alive, index) =>
          alive ? (
            <div
              key={index}
              className="absolute rounded-sm"
              style={{
                ...toPercentRect(brickRect(index)),
                backgroundColor: brickRowColor(index),
              }}
            />
          ) : null
        )}

        <div
          className="absolute rounded-full bg-foreground"
          style={toPercentRect({
            x: state.ball.x - BALL_SIZE / 2,
            y: state.ball.y - BALL_SIZE / 2,
            width: BALL_SIZE,
            height: BALL_SIZE,
          })}
        />

        <div
          className="absolute rounded-full bg-primary"
          style={toPercentRect({
            x: state.paddleX,
            y: PADDLE_Y,
            width: PADDLE_WIDTH,
            height: PADDLE_HEIGHT,
          })}
        />

        {state.ballAttached && state.status === "playing" ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-8 text-center text-xs font-medium text-primary animate-pulse">
            Tap / Space to launch
          </p>
        ) : null}
        {state.status === "stage-clear" ? (
          <StandardGameOverOverlay
            variant="stage-clear"
            stageLabel={`Stage ${state.stage} Clear`}
            score={state.score}
            gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={handleExit}
            onRetry={handleRetry}
            onRestart={handleRetry}
            onNextStage={() => dispatch({ type: "advanceStage" })}
          />
        ) : null}

        {state.status === "over" || state.status === "won" ? (
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

        {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}

        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}

        {phase === "resume-prompt" ? (
          <ResumeDialog
            gameTitle="Breakout"
            onResume={onResume}
            onNewGame={handleNewGame}
          />
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        패들을 맞춘 뒤 탭(또는 스페이스)으로 공을 발사하세요.
      </p>
    </div>
  );
}
