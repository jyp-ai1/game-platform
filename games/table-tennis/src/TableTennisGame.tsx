"use client";

import {
  clearSave,
  emitGameRetry,
  getGroupDifficulty,
  playSuccessSound,
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
import type { CSSProperties, PointerEvent } from "react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  BALL_R,
  computeScore,
  createInitialState,
  FIELD_H,
  FIELD_W,
  movePlayer,
  PADDLE_H,
  PADDLE_W,
  step,
  type TableTennisState,
} from "./engine";
import {
  playGameOverAudio,
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "table-tennis";
const MAX_DT = 0.05;

type Action =
  | { type: "step"; dt: number }
  | { type: "move"; y: number }
  | { type: "restart" };

function reducer(state: TableTennisState, action: Action): TableTennisState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "move":
      return movePlayer(state, action.y);
    case "step":
      return step(state, action.dt);
    default:
      return state;
  }
}

function pct(x: number, y: number, w: number, h: number): CSSProperties {
  return {
    left: `${(x / FIELD_W) * 100}%`,
    top: `${(y / FIELD_H) * 100}%`,
    width: `${(w / FIELD_W) * 100}%`,
    height: `${(h / FIELD_H) * 100}%`,
    transform: "translate(-50%, -50%)",
  };
}

export function TableTennisGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const stage = state.playerScore + state.cpuScore + 1;
  const prevScoreRef = useRef(0);
  const prevStatusRef = useRef(state.status);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    stageIndex: stage,
    fieldRef,
  });
  const diff = getGroupDifficulty(GAME_SLUG, stage);
  const stateRef = useRef(state);
  stateRef.current = state;

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "over" ? null : state),
    [state]
  );

  useEffect(() => {
    let last: number | null = null;
    let raf = 0;
    function loop(t: number) {
      if (last !== null && stateRef.current.status === "playing" && canPlayRef.current) {
        dispatch({ type: "step", dt: Math.min(MAX_DT, (t - last) / 1000) * diff.speedMult });
      }
      last = t;
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [canPlayRef, diff.speedMult]);

  const prevPlayerScore = useRef(state.playerScore);
  const prevCpuScore = useRef(state.cpuScore);
  const [scoreFlash, setScoreFlash] = useState<"player" | "cpu" | null>(null);

  useEffect(() => {
    if (state.playerScore > prevPlayerScore.current) {
      playSuccessSound();
      playGameFeel("goal", fieldRef.current);
      setScoreFlash("player");
      window.setTimeout(() => setScoreFlash(null), 500);
    }
    if (state.cpuScore > prevCpuScore.current) {
      playGameFeel("wrong", fieldRef.current);
      setScoreFlash("cpu");
      window.setTimeout(() => setScoreFlash(null), 500);
    }
    prevPlayerScore.current = state.playerScore;
    prevCpuScore.current = state.cpuScore;
  }, [state.playerScore, state.cpuScore]);

  useEffect(() => {
    if (state.status === "over" && prevStatusRef.current !== "over") {
      if (state.winner === "player") {
        playStageClearAudio();
      } else {
        playGameOverAudio();
      }
    }
    prevStatusRef.current = state.status;
  }, [state.status, state.winner]);

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, state.playerScore, state.winner, reportScore]);

  const onPointer = useCallback((e: PointerEvent) => {
    const el = fieldRef.current;
    if (!el || !canPlayRef.current) return;
    if (e.type === "pointerdown") {
      primeGameAudio();
      playGameFeel("button", el);
    }
    const rect = el.getBoundingClientRect();
    const y = ((e.clientY - rect.top) / rect.height) * FIELD_H;
    dispatch({ type: "move", y });
  }, [canPlayRef]);

  const msg =
    state.winner === "player"
      ? "You Win!"
      : state.winner === "cpu"
        ? "CPU Wins!"
        : "Move paddle — first to 5";


  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    resetGameAudioPrime();
    prevScoreRef.current = 0;
    prevPlayerScore.current = 0;
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    resetGameAudioPrime();
    prevScoreRef.current = 0;
    prevPlayerScore.current = 0;
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm justify-between">
        <ScoreBox label="You" value={state.playerScore} />
        <ScoreBox label="CPU" value={state.cpuScore} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <div
        ref={fieldRef}
        className={cn(
          "relative aspect-[5/3] w-full max-w-sm touch-none rounded-xl border-2 border-emerald-600/50 bg-emerald-950/40",
          scoreFlash && "game-effect-shake"
        )}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
      >
        {scoreFlash ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-10 game-effect-flash",
              scoreFlash === "player" ? "bg-primary/20" : "bg-destructive/20"
            )}
          />
        ) : null}
        <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/20" />
        <div className="absolute rounded bg-primary" style={pct(16, state.playerY, PADDLE_W, PADDLE_H)} />
        <div className="absolute rounded bg-destructive" style={pct(FIELD_W - 16, state.cpuY, PADDLE_W, PADDLE_H)} />
        <div className="absolute rounded-full bg-amber-300" style={pct(state.ballX, state.ballY, BALL_R * 2, BALL_R * 2)} />
        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}
      </div>
      <p className="text-sm text-muted-foreground">{msg}</p>
      {state.status === "over" ? (
        <StandardGameOverOverlay
          message={msg}
          score={computeScore(state)}
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
        <ResumeDialog gameTitle="Table Tennis" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">패들로 공을 쳐서 5점 먼저 획득.</p>
    </div>
  );
}
