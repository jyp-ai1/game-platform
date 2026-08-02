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
import type { CSSProperties } from "react";
import { useEffect, useCallback, useReducer, useRef } from "react";

import {
  createInitialState,
  enemiesRemaining,
  fire,
  GRID_SIZE,
  move,
  step,
  type Facing,
  type TankState,
} from "./engine";
import {
  playGameOverAudio,
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "tank-battle";
const MAX_DT = 0.05;

type Action =
  | { type: "step"; dt: number }
  | { type: "move"; dir: Facing }
  | { type: "fire" }
  | { type: "restart" };

function reducer(state: TankState, action: Action): TankState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "move":
      return move(state, action.dir);
    case "fire":
      return fire(state);
    case "step":
      return step(state, action.dt);
    default:
      return state;
  }
}

function toPercentBox(x: number, y: number, size = 1): CSSProperties {
  return {
    left: `${(x / GRID_SIZE) * 100}%`,
    top: `${(y / GRID_SIZE) * 100}%`,
    width: `${(size / GRID_SIZE) * 100}%`,
    height: `${(size / GRID_SIZE) * 100}%`,
  };
}

const FACING_ROTATION: Record<Facing, string> = {
  up: "rotate(0deg)",
  right: "rotate(90deg)",
  down: "rotate(180deg)",
  left: "rotate(270deg)",
};

const DIRECTION_KEYS: Record<string, Facing> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

function BarrelIndicator({ facing }: { facing: Facing }) {
  return (
    <div
      className="absolute inset-0 flex items-start justify-center"
      style={{ transform: FACING_ROTATION[facing] }}
    >
      <div className="mt-[-2px] h-1/2 w-[15%] rounded-full bg-foreground/80" />
    </div>
  );
}

export function TankBattleGame() {
  const { phase, initialState, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
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

  const stageIndex = state.enemiesDefeated + 1;
  const diff = getGroupDifficulty(GAME_SLUG, stageIndex);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    stageIndex,
    fieldRef,
  });
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

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
      const dir = DIRECTION_KEYS[event.key];
      if (dir) {
        event.preventDefault();
        primeGameAudio();
        dispatch({ type: "move", dir });
        return;
      }
      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        primeGameAudio();
        dispatch({ type: "fire" });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canPlayRef]);

  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleMove(dir: Facing) {
    if (!canPlayRef.current || state.status !== "playing") return;
    primeGameAudio();
    dispatch({ type: "move", dir });
  }

  function handleFire() {
    if (!canPlayRef.current || state.status !== "playing") return;
    primeGameAudio();
    playGameFeel("button", fieldRef.current);
    dispatch({ type: "fire" });
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
          <ScoreBox label="Score" value={state.score} />
          <ScoreBox label="Enemies" value={enemiesRemaining(state)} />
          <ScoreBox label="Stage" value={stageIndex} />
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
        className="relative w-full max-w-sm touch-none select-none overflow-hidden rounded-xl bg-muted transition-transform duration-150 active:scale-[0.99]"
        ref={fieldRef}
        style={{ aspectRatio: "1 / 1" }}
        onPointerDown={() => primeGameAudio()}
      >
        {state.grid.map((row, rowIndex) =>
          row.map((tile, colIndex) => {
            if (tile === "empty") {
              return null;
            }
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={cn(
                  "absolute",
                  tile === "brick" && "bg-amber-700/80",
                  tile === "steel" && "bg-slate-500",
                  tile === "water" && "bg-sky-500/70"
                )}
                style={toPercentBox(colIndex, rowIndex)}
              />
            );
          })
        )}

        {state.bullets.map((bullet, index) => (
          <div
            key={index}
            className="absolute flex items-center justify-center"
            style={toPercentBox(bullet.x, bullet.y)}
          >
            <div
              className={cn(
                "h-[20%] w-[20%] rounded-full",
                bullet.owner === "player" ? "bg-foreground" : "bg-destructive"
              )}
            />
          </div>
        ))}

        {state.enemy ? (
          <div
            className="absolute rounded-sm bg-destructive/80"
            style={toPercentBox(state.enemy.x, state.enemy.y)}
          >
            <BarrelIndicator facing={state.enemy.facing} />
          </div>
        ) : null}

        <div
          className="absolute rounded-sm bg-primary"
          style={toPercentBox(state.playerX, state.playerY)}
        >
          <BarrelIndicator facing={state.playerFacing} />
        </div>

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
            gameTitle="Tank Battle"
            onResume={onResume}
            onNewGame={handleNewGame}
          />
        ) : null}

        {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}

        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}
      </div>

      <div className="grid w-full max-w-sm grid-cols-3 gap-2">
        <div />
        <Button variant="secondary" disabled={!canPlay} onClick={() => handleMove("up")} aria-label="위">
          ↑
        </Button>
        <div />
        <Button variant="secondary" disabled={!canPlay} onClick={() => handleMove("left")} aria-label="왼쪽">
          ←
        </Button>
        <Button variant="secondary" disabled={!canPlay} onClick={handleFire} aria-label="발사">
          🔥
        </Button>
        <Button variant="secondary" disabled={!canPlay} onClick={() => handleMove("right")} aria-label="오른쪽">
          →
        </Button>
        <div />
        <Button variant="secondary" disabled={!canPlay} onClick={() => handleMove("down")} aria-label="아래">
          ↓
        </Button>
        <div />
      </div>

      <p className="text-xs text-muted-foreground">
        방향키 또는 D-pad로 이동, 스페이스/🔥로 발사. 벽돌은 파괴 가능합니다.
      </p>
    </div>
  );
}
