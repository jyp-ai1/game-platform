"use client";

import {
  clearSave,
  playClickSound,
  playFailSound,
  playGameOverSound,
  playPopSound,
  playStartSound,
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
import type { CSSProperties, PointerEvent } from "react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  BUBBLE_SIZE,
  COLORS,
  type BubbleColor,
  type BubblePopState,
  createInitialState,
  fireBubble,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  MAX_AIM_ANGLE,
  ROWS,
  setShooterAngle,
  SHOOTER_X,
  SHOOTER_Y,
  step,
} from "./engine";
import { getBubbleStage } from "./bubble-stage-config";

const GAME_SLUG = "bubble-pop";
const MAX_DT = 0.05;
const AIM_LINE_LENGTH = 60;

interface PopParticle {
  id: number;
  xPct: number;
  yPct: number;
  color: BubbleColor;
  life: number;
}

const COLOR_CLASSES: Record<BubbleColor, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  purple: "bg-purple-500",
};

type Action =
  | { type: "step"; dt: number }
  | { type: "setAngle"; angle: number }
  | { type: "fire" }
  | { type: "restart" }
  | { type: "nextStage" };

function reducer(state: BubblePopState, action: Action): BubblePopState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "nextStage":
      return createInitialState(state.stageIndex + 1, state.score);
    case "setAngle":
      return setShooterAngle(state, action.angle);
    case "fire":
      return fireBubble(state);
    case "step":
      return step(state, action.dt);
    default:
      return state;
  }
}

function toPercent(value: number, total: number): string {
  return `${(value / total) * 100}%`;
}

function bubbleStyle(row: number, col: number): CSSProperties {
  const isOdd = row % 2 === 1;
  const x = col * BUBBLE_SIZE + (isOdd ? BUBBLE_SIZE / 2 : 0);
  const y = row * BUBBLE_SIZE;
  return {
    left: toPercent(x, FIELD_WIDTH),
    top: toPercent(y, FIELD_HEIGHT),
    width: toPercent(BUBBLE_SIZE, FIELD_WIDTH),
    height: toPercent(BUBBLE_SIZE, FIELD_HEIGHT),
  };
}

export function BubblePopGame() {
  const { phase, initialState, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
  });
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const sessionActive = phase === "ready" && !showCountdown;
  const { recordStageClear, recordGameRetry, recordGameEnd, resetSession } =
    useGameSession(GAME_SLUG, sessionActive);
  const stageClearReported = useRef(false);
  const prevScoreRef = useRef(0);
  const particleIdRef = useRef(0);
  const [particles, setParticles] = useState<PopParticle[]>([]);
  const [popFlash, setPopFlash] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
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

      if (stateRef.current.status === "playing" && canPlayRef.current) {
        dispatch({ type: "step", dt });
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
    if (sessionActive) {
      playStartSound();
    }
  }, [sessionActive]);

  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      playPopSound();
      setPopFlash(true);
      const burst: PopParticle[] = Array.from({ length: 8 }, (_, i) => ({
        id: particleIdRef.current++,
        xPct: 35 + Math.random() * 30,
        yPct: 15 + Math.random() * 45,
        color: COLORS[i % COLORS.length]!,
        life: 1,
      }));
      setParticles((p) => [...p, ...burst].slice(-40));
      window.setTimeout(() => setPopFlash(false), 120);
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

  useEffect(() => {
    if (particles.length === 0) return;
    const id = window.setInterval(() => {
      setParticles((p) =>
        p
          .map((pt) => ({ ...pt, life: pt.life - 0.12 }))
          .filter((pt) => pt.life > 0)
      );
    }, 32);
    return () => window.clearInterval(id);
  }, [particles.length]);

  useEffect(() => {
    if (state.status === "over") {
      playFailSound();
      playGameOverSound();
    }
    if (state.status === "won" || state.status === "stage-clear") {
      playStartSound();
    }
  }, [state.status]);

  useEffect(() => {
    if (state.status === "stage-clear" && !stageClearReported.current) {
      stageClearReported.current = true;
      recordStageClear(state.stageIndex, state.score);
      reportScore(GAME_SLUG, state.score);
    }
    if (state.status === "playing") {
      stageClearReported.current = false;
    }
  }, [state.status, state.stageIndex, state.score, recordStageClear, reportScore]);

  useEffect(() => {
    if (state.status === "over" || state.status === "won") {
      reportScore(GAME_SLUG, state.score);
      recordGameEnd({
        score: state.score,
        outcome: state.status === "won" ? "clear" : "failure",
        stageReached: state.stageIndex,
      });
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, state.stageIndex, reportScore, recordGameEnd]);

  function handleRetry() {
    recordGameRetry();
    resetSession();
    dispatch({ type: "restart" });
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!canPlayRef.current) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        dispatch({ type: "fire" });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
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
      const relativeY = ((event.clientY - rect.top) / rect.height) * FIELD_HEIGHT;
      const angle = Math.atan2(relativeX - SHOOTER_X, SHOOTER_Y - relativeY);
      dispatch({ type: "setAngle", angle });
    },
    [canPlayRef]
  );

  const handlePointerDown = useCallback(() => {
    if (!canPlayRef.current) {
      return;
    }
    playClickSound();
    dispatch({ type: "fire" });
  }, [canPlayRef]);

  const aimX2 = SHOOTER_X + Math.sin(state.shooterAngle) * AIM_LINE_LENGTH;
  const aimY2 = SHOOTER_Y - Math.cos(state.shooterAngle) * AIM_LINE_LENGTH;

  return (
    <div className="relative flex w-full max-w-full flex-col items-center gap-4 overflow-hidden">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex items-center gap-2">
          <ScoreBox label="Stage" value={state.stageIndex} />
          <ScoreBox label="Score" value={state.score} />
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">
              Next
            </span>
            <span
              className={cn(
                "block h-3 w-3 rounded-full",
                COLOR_CLASSES[state.nextColor]
              )}
            />
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={() => dispatch({ type: "restart" })}
        >
          <RotateCcw />
        </Button>
      </div>

      <div
        ref={fieldRef}
        className={cn(
          "relative mx-auto w-full touch-none select-none overflow-hidden rounded-xl bg-muted",
          popFlash && "ring-2 ring-primary/40"
        )}
        style={{
          aspectRatio: `${FIELD_WIDTH} / ${FIELD_HEIGHT}`,
          maxWidth: "min(100%, 20rem)",
          maxHeight: "min(70vh, 28rem)",
        }}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
      >
        <div
          className="absolute inset-x-0 border-t-2 border-dashed border-destructive/60"
          style={{ top: toPercent((ROWS - 1) * BUBBLE_SIZE, FIELD_HEIGHT) }}
        />

        {state.grid.map((rowColors, row) =>
          rowColors.map((color, col) =>
            color ? (
              <div
                key={`${row}-${col}`}
                className={cn(
                  "absolute rounded-full transition-transform duration-150",
                  COLOR_CLASSES[color]
                )}
                style={bubbleStyle(row, col)}
              />
            ) : null
          )
        )}

        {state.flyingBubble ? (
          <div
            className={cn(
              "absolute rounded-full",
              COLOR_CLASSES[state.flyingBubble.color]
            )}
            style={{
              left: toPercent(state.flyingBubble.x - BUBBLE_SIZE / 2, FIELD_WIDTH),
              top: toPercent(state.flyingBubble.y - BUBBLE_SIZE / 2, FIELD_HEIGHT),
              width: toPercent(BUBBLE_SIZE, FIELD_WIDTH),
              height: toPercent(BUBBLE_SIZE, FIELD_HEIGHT),
            }}
          />
        ) : null}

        {particles.map((p) => (
          <div
            key={p.id}
            className={cn("pointer-events-none absolute rounded-full", COLOR_CLASSES[p.color])}
            style={{
              left: `${p.xPct}%`,
              top: `${p.yPct}%`,
              width: "6%",
              height: "6%",
              opacity: p.life,
              transform: `scale(${1 + (1 - p.life) * 1.5})`,
            }}
          />
        ))}

        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <line
            x1={SHOOTER_X}
            y1={SHOOTER_Y}
            x2={aimX2}
            y2={aimY2}
            stroke="currentColor"
            strokeWidth={2}
            strokeDasharray="4 4"
            className="text-foreground/50"
          />
        </svg>

        <div
          className={cn(
            "absolute rounded-full ring-2 ring-foreground/40",
            COLOR_CLASSES[state.currentColor]
          )}
          style={{
            left: toPercent(SHOOTER_X - BUBBLE_SIZE / 2, FIELD_WIDTH),
            top: toPercent(SHOOTER_Y - BUBBLE_SIZE / 2, FIELD_HEIGHT),
            width: toPercent(BUBBLE_SIZE, FIELD_WIDTH),
            height: toPercent(BUBBLE_SIZE, FIELD_HEIGHT),
          }}
        />

        {state.status === "stage-clear" ? (
          <StandardGameOverOverlay
            variant="stage-clear"
            stageLabel={getBubbleStage(state.stageIndex).label}
            score={state.score}
            gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={feel.handleExit}
            onRetry={handleRetry}
            onRestart={handleRetry}
            onNextStage={() => dispatch({ type: "nextStage" })}
          />
        ) : null}

        {state.status === "over" || state.status === "won" ? (
          <StandardGameOverOverlay
            message={state.status === "won" ? "You Win!" : "Game Over"}
            score={state.score}
            gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={feel.handleExit}
            onRetry={handleRetry}
            onRestart={() => dispatch({ type: "restart" })}
          />
        ) : null}

        {phase === "resume-prompt" ? (
          <ResumeDialog
            gameTitle="Bubble Pop"
            onResume={onResume}
            onNewGame={onNewGame}
          />
        ) : null}

        {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      </div>

      <p className="text-xs text-muted-foreground">
        마우스로 조준하고 클릭하거나 스페이스바를 눌러 버블을 발사하세요. 같은
        색 버블 3개 이상을 모으면 터집니다.
      </p>
    </div>
  );
}
