"use client";

import {
  clearSave,
  ResumeDialog,
  SaveIndicator,
  useAutoSave,
  useGameSDK,
  emitGameRetry,
  useReadyCountdown,
  useResumableGame,
} from "@game-platform/game-sdk";
import { Button, GameOverOverlay, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import type { CSSProperties, PointerEvent } from "react";
import { useCallback, useEffect, useReducer, useRef } from "react";

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
      if (last !== null && stateRef.current.status === "playing") {
        dispatch({ type: "step", dt: Math.min(MAX_DT, (t - last) / 1000) });
      }
      last = t;
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.playerScore, state.winner, reportScore]);

  const onPointer = useCallback((e: PointerEvent) => {
    const el = fieldRef.current;
    if (!el || !canPlayRef.current) return;
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

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm justify-between">
        <ScoreBox label="You" value={state.playerScore} />
        <ScoreBox label="CPU" value={state.cpuScore} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <div
        ref={fieldRef}
        className="relative aspect-[5/3] w-full max-w-sm touch-none rounded-xl border-2 border-emerald-600/50 bg-emerald-950/40"
        onPointerMove={onPointer}
        onPointerDown={onPointer}
      >
        <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/20" />
        <div className="absolute rounded bg-primary" style={pct(16, state.playerY, PADDLE_W, PADDLE_H)} />
        <div className="absolute rounded bg-destructive" style={pct(FIELD_W - 16, state.cpuY, PADDLE_W, PADDLE_H)} />
        <div className="absolute rounded-full bg-amber-300" style={pct(state.ballX, state.ballY, BALL_R * 2, BALL_R * 2)} />
      </div>
      <p className="text-sm text-muted-foreground">{msg}</p>
      {state.status === "over" ? (
        <GameOverOverlay
          message={msg}
          score={computeScore(state)}
          gameSlug={GAME_SLUG}
          onRetry={() => emitGameRetry(GAME_SLUG)}
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Table Tennis" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
    </div>
  );
}
