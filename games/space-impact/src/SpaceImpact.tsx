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
  BULLET_HEIGHT,
  BULLET_WIDTH,
  createInitialState,
  ENEMY_SIZE,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  firePlayerBullet,
  PLAYER_SIZE,
  PLAYER_X,
  setPlayerY,
  step,
  type SpaceImpactState,
} from "./engine";
import { playGameOverAudio, playStageClearAudio, primeGameAudio, resetGameAudioPrime } from "./game-audio-prime";

const GAME_SLUG = "space-impact";
const PLAYER_KEY_SPEED = 240;
const MAX_DT = 0.05;

type Action =
  | { type: "step"; dt: number }
  | { type: "setPlayerY"; y: number }
  | { type: "fire" }
  | { type: "restart" };

function reducer(state: SpaceImpactState, action: Action): SpaceImpactState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "setPlayerY":
      return setPlayerY(state, action.y);
    case "fire":
      return firePlayerBullet(state);
    case "step":
      return step(state, action.dt);
    default:
      return state;
  }
}

function toPercentRect(
  x: number,
  y: number,
  width: number,
  height: number
): CSSProperties {
  return {
    left: `${(x / FIELD_WIDTH) * 100}%`,
    top: `${(y / FIELD_HEIGHT) * 100}%`,
    width: `${(width / FIELD_WIDTH) * 100}%`,
    height: `${(height / FIELD_HEIGHT) * 100}%`,
  };
}

export function SpaceImpactGame() {
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
  const prevWaveRef = useRef(state.wave);
  
  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      const gain = state.score - prevScoreRef.current;
      playGameFeel(gain >= 25 ? "combo" : "explosion", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

  const stageIndex = state.wave;
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
    () => (state.status !== "playing" ? null : state),
    [state]
  );

  useEffect(() => {
    function loop(time: number) {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }
      const dt = Math.min(MAX_DT, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;

      if (canPlayRef.current && stateRef.current.status === "playing") {
        let dy = 0;
        if (keysRef.current.has("ArrowUp")) {
          dy -= 1;
        }
        if (keysRef.current.has("ArrowDown")) {
          dy += 1;
        }
        if (dy !== 0) {
          dispatch({
            type: "setPlayerY",
            y: stateRef.current.playerY + dy * PLAYER_KEY_SPEED * dt,
          });
        }
        if (keysRef.current.has(" ")) {
          dispatch({ type: "fire" });
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
  }, [canPlayRef]);

  useEffect(() => {
    if (state.wave > prevWaveRef.current) {
      playStageClearAudio();
    }
    prevWaveRef.current = state.wave;
  }, [state.wave]);

  useEffect(() => {
    if (state.status !== "playing" && prevStatusRef.current === "playing") {
      playGameOverAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    if (state.status !== "playing") {
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, state.score, reportScore]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === " ") {
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

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!canPlayRef.current) {
        return;
      }
      const field = fieldRef.current;
      if (!field) {
        return;
      }
      const rect = field.getBoundingClientRect();
      const relativeY = ((event.clientY - rect.top) / rect.height) * FIELD_HEIGHT;
      dispatch({ type: "setPlayerY", y: relativeY - PLAYER_SIZE / 2 });
    },
    [canPlayRef]
  );

  const handlePointerDown = useCallback(() => {
    if (!canPlayRef.current) {
      return;
    }
    primeGameAudio();
    playGameFeel("button", fieldRef.current);
    dispatch({ type: "fire" });
  }, [canPlayRef]);


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
          <ScoreBox label="Wave" value={state.wave} />
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
        className="relative w-full max-w-[min(100%,20.5rem)] touch-none select-none overflow-hidden rounded-xl bg-slate-950 transition-transform duration-150 active:scale-[0.99]"
        style={{ aspectRatio: `${FIELD_WIDTH} / ${FIELD_HEIGHT}` }}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
      >
        {state.enemies.map((enemy, index) => (
          <div
            key={index}
            className="absolute rounded-sm bg-red-400"
            style={toPercentRect(enemy.x, enemy.y, ENEMY_SIZE, ENEMY_SIZE)}
          />
        ))}

        {state.bullets.map((bullet, index) => (
          <div
            key={index}
            className="absolute rounded-full bg-sky-300"
            style={toPercentRect(
              bullet.x,
              bullet.y - BULLET_HEIGHT / 2,
              BULLET_WIDTH,
              BULLET_HEIGHT
            )}
          />
        ))}

        <div
          className="absolute rounded-sm bg-emerald-400"
          style={toPercentRect(PLAYER_X, state.playerY, PLAYER_SIZE, PLAYER_SIZE)}
        />

        {state.status !== "playing" ? (
          <StandardGameOverOverlay
            message="Game Over"
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
            gameTitle="Space Impact"
            onResume={onResume}
            onNewGame={handleNewGame}
          />
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        방향키 또는 드래그로 상하 이동, 스페이스바 또는 탭으로 발사하세요.
      </p>
    </div>
  );
}
