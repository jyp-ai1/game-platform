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
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  createInitialState,
  ENEMY_HEIGHT,
  ENEMY_WIDTH,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  firePlayerBullet,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_Y,
  setPlayerX,
  step,
  type Bullet,
  type Enemy,
  type GalaxyState,
} from "./engine";
import {
  playGameOverAudio,
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "galaxy-defender";
const PLAYER_KEY_SPEED = 300;
const MAX_DT = 0.05;
const BULLET_WIDTH = 4;
const BULLET_HEIGHT = 8;

type Action =
  | { type: "step"; dt: number }
  | { type: "setPlayerX"; x: number }
  | { type: "restart" };

function reducer(state: GalaxyState, action: Action): GalaxyState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "setPlayerX":
      return setPlayerX(state, action.x);
    case "step": {
      const fired = firePlayerBullet(state);
      return step(fired, action.dt);
    }
    default:
      return state;
  }
}

function toPercentBox(
  centerX: number,
  centerY: number,
  width: number,
  height: number
): CSSProperties {
  return {
    left: `${((centerX - width / 2) / FIELD_WIDTH) * 100}%`,
    top: `${((centerY - height / 2) / FIELD_HEIGHT) * 100}%`,
    width: `${(width / FIELD_WIDTH) * 100}%`,
    height: `${(height / FIELD_HEIGHT) * 100}%`,
  };
}

function enemyClassName(enemy: Enemy): string {
  if (enemy.state === "diving") {
    return "absolute scale-110 rounded-sm bg-destructive transition-transform";
  }
  if (enemy.state === "returning") {
    return "absolute rounded-sm bg-primary/60 transition-transform";
  }
  return "absolute rounded-sm bg-primary/80 transition-transform";
}

function bulletClassName(bullet: Bullet): string {
  return bullet.owner === "player"
    ? "absolute rounded-full bg-foreground"
    : "absolute rounded-full bg-destructive";
}

export function GalaxyDefenderGame() {
  const { phase, initialState, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const prevScoreRef = useRef(0);
  const prevStatusRef = useRef(state.status);
  const prevWaveRef = useRef(state.wave);
  const [waveMilestone, setWaveMilestone] = useState<number | null>(null);

  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      const gain = state.score - prevScoreRef.current;
      playGameFeel(gain >= 25 ? "combo" : "explosion", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

  useEffect(() => {
    if (state.wave > prevWaveRef.current && state.wave % 5 === 0) {
      playStageClearAudio();
      setWaveMilestone(state.wave);
      const timeout = window.setTimeout(() => setWaveMilestone(null), 1800);
      prevWaveRef.current = state.wave;
      return () => window.clearTimeout(timeout);
    }
    prevWaveRef.current = state.wave;
  }, [state.wave]);

  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    stageIndex: state.wave,
    muteScoreGain: true,
    fieldRef,
  });
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

  const diff = getGroupDifficulty(GAME_SLUG, state.wave);
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

      if (stateRef.current.status === "playing" && canPlayRef.current) {
        let dx = 0;
        if (keysRef.current.has("ArrowLeft")) {
          dx -= 1;
        }
        if (keysRef.current.has("ArrowRight")) {
          dx += 1;
        }
        if (dx !== 0) {
          dispatch({
            type: "setPlayerX",
            x: stateRef.current.playerX + dx * PLAYER_KEY_SPEED * dt,
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
  }, [canPlayRef]);

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
  }, [canPlayRef]);

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
      const relativeX = ((event.clientX - rect.left) / rect.width) * FIELD_WIDTH;
      dispatch({ type: "setPlayerX", x: relativeX });
    },
    [canPlayRef]
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
        className="relative w-full max-w-[min(100%,20.5rem)] touch-none select-none overflow-hidden rounded-xl bg-muted transition-transform duration-150 active:scale-[0.99]"
        style={{ aspectRatio: `${FIELD_WIDTH} / ${FIELD_HEIGHT}` }}
        onPointerMove={handlePointerMove}
        onPointerDown={() => {
          primeGameAudio();
          playGameFeel("button", fieldRef.current);
        }}
      >
        {state.enemies.map((enemy) => (
          <div
            key={enemy.id}
            className={enemyClassName(enemy)}
            style={toPercentBox(enemy.pos.x, enemy.pos.y, ENEMY_WIDTH, ENEMY_HEIGHT)}
          />
        ))}

        {state.bullets.map((bullet, index) => (
          <div
            key={index}
            className={bulletClassName(bullet)}
            style={toPercentBox(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT)}
          />
        ))}

        <div
          className="absolute rounded-sm bg-foreground"
          style={toPercentBox(state.playerX, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT)}
        />

        {waveMilestone !== null ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <p className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Wave {waveMilestone}!
            </p>
          </div>
        ) : null}

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
            gameTitle="Galaxy Defender"
            onResume={onResume}
            onNewGame={handleNewGame}
          />
        ) : null}

        {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}

        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}
      </div>

      <p className="text-xs text-muted-foreground">
        방향키 또는 드래그로 함선을 움직이세요. 자동으로 발사됩니다.
      </p>
    </div>
  );
}
