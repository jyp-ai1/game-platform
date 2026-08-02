"use client";

import {
  clearSave,
  emitGameRetry,
  getGroupDifficulty,
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
  GameFeelLayer,
} from "@game-platform/game-sdk";
import { Button, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import type { CSSProperties, PointerEvent } from "react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  createInitialState,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  MATCH_TIME_LIMIT_SECONDS,
  movePlayerPaddle,
  PADDLE_RADIUS,
  PUCK_RADIUS,
  step,
  type AirHockeyState,
} from "./engine";
import {
  playGameOverAudio,
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "air-hockey";
const MAX_DT = 0.05;

type Action =
  | { type: "step"; dt: number }
  | { type: "movePlayer"; target: { x: number; y: number } }
  | { type: "restart" };

function reducer(state: AirHockeyState, action: Action): AirHockeyState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "movePlayer":
      return movePlayerPaddle(state, action.target);
    case "step":
      return step(state, action.dt);
    default:
      return state;
  }
}

function toPercent(x: number, y: number, radius: number): CSSProperties {
  return {
    left: `${((x - radius) / FIELD_WIDTH) * 100}%`,
    top: `${((y - radius) / FIELD_HEIGHT) * 100}%`,
    width: `${((radius * 2) / FIELD_WIDTH) * 100}%`,
    height: `${((radius * 2) / FIELD_HEIGHT) * 100}%`,
  };
}

export function AirHockeyGame() {
  const { phase, initialState, onResume, onNewGame } = useResumableGame(
    GAME_SLUG,
    createInitialState
  );
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    stageIndex: state.playerScore + state.aiScore + 1,
    fieldRef,
  });
  const diff = getGroupDifficulty(GAME_SLUG, state.playerScore + state.aiScore + 1);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const prevStatusRef = useRef(state.status);
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

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

  const prevPlayerScore = useRef(state.playerScore);
  useEffect(() => {
    if (state.playerScore > prevPlayerScore.current) {
      playGameFeel("goal", fieldRef.current);
    }
    prevPlayerScore.current = state.playerScore;
  }, [state.playerScore]);

  useEffect(() => {
    if (state.status !== "playing" && prevStatusRef.current === "playing") {
      if (state.winner === "player") {
        playStageClearAudio();
      } else {
        playGameOverAudio();
      }
    }
    prevStatusRef.current = state.status;
  }, [state.status, state.winner]);

  useEffect(() => {
    if (state.status !== "playing") {
      reportScore(GAME_SLUG, state.playerScore);
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, state.playerScore, reportScore]);

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

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!canPlayRef.current || stateRef.current.status !== "playing") {
        return;
      }
      const field = fieldRef.current;
      if (!field) {
        return;
      }
      const rect = field.getBoundingClientRect();
      const target = {
        x: ((event.clientX - rect.left) / rect.width) * FIELD_WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * FIELD_HEIGHT,
      };
      dispatch({ type: "movePlayer", target });
    },
    []
  );

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="You" value={state.playerScore} />
          <ScoreBox label="CPU" value={state.aiScore} />
          <ScoreBox
            label="Time"
            value={Math.max(0, Math.ceil(MATCH_TIME_LIMIT_SECONDS - state.elapsedSeconds))}
          />
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
        ref={fieldRef}
        className="relative w-full max-w-sm touch-none select-none overflow-hidden rounded-xl bg-muted transition-transform duration-150 active:scale-[0.99]"
        style={{ aspectRatio: `${FIELD_WIDTH} / ${FIELD_HEIGHT}` }}
        onPointerMove={handlePointerMove}
        onPointerDown={() => {
          primeGameAudio();
          playGameFeel("button", fieldRef.current);
        }}
      >
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-foreground/20" />
        <div
          className="absolute top-0 h-1 -translate-x-1/2 bg-destructive"
          style={{ left: "50%", width: `${(140 / FIELD_WIDTH) * 100}%` }}
        />
        <div
          className="absolute bottom-0 h-1 -translate-x-1/2 bg-primary"
          style={{ left: "50%", width: `${(140 / FIELD_WIDTH) * 100}%` }}
        />

        <div
          className="absolute rounded-full bg-foreground"
          style={toPercent(state.puck.x, state.puck.y, PUCK_RADIUS)}
        />
        <div
          className="absolute rounded-full bg-destructive/80"
          style={toPercent(state.aiPaddle.x, state.aiPaddle.y, PADDLE_RADIUS)}
        />
        <div
          className="absolute rounded-full bg-primary"
          style={toPercent(
            state.playerPaddle.x,
            state.playerPaddle.y,
            PADDLE_RADIUS
          )}
        />

        {state.status !== "playing" ? (
          <StandardGameOverOverlay
            message={
              state.winner === "player"
                ? "You Win!"
                : state.winner === "draw"
                  ? "Draw!"
                  : "Game Over"
            }
            score={state.playerScore}
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
      </div>

      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Air Hockey" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}

      <p className="text-xs text-muted-foreground">
        드래그(또는 터치)로 패들을 움직여 퍽을 쳐내세요. 5점을 먼저 획득하거나
        3분이 지나면 승리합니다.
      </p>
    </div>
  );
}
