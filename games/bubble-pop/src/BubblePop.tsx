"use client";

import {
  clearSave,
  emitGameRetry,
  GameFeelLayer,
  playGameFeel,
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
  BUBBLE_RADIUS,
  BUBBLE_SIZE,
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
  const fieldRef = useRef<HTMLDivElement>(null);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    muteScoreGain: true,
    fieldRef,
  });
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const sessionActive = phase === "ready" && !showCountdown;
  const { recordStageClear, recordGameEnd, resetSession } =
    useGameSession(GAME_SLUG, sessionActive);
  const stageClearReported = useRef(false);
  const particleIdRef = useRef(0);
  const [particles, setParticles] = useState<PopParticle[]>([]);
  const [comboLabel, setComboLabel] = useState<string | null>(null);
  const [popFlash, setPopFlash] = useState(false);
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
      playGameFeel("button", fieldRef.current);
    }
  }, [sessionActive]);

  useEffect(() => {
    if (state.lastPops.length === 0) {
      return;
    }
    if (state.lastPops.length >= 5) {
      playGameFeel("combo", fieldRef.current);
      setComboLabel(`${state.lastPops.length}x COMBO!`);
    } else if (state.lastPops.length >= 3) {
      playGameFeel("combo", fieldRef.current);
      setComboLabel(`${state.lastPops.length}x Combo`);
    } else {
      playGameFeel("pop", fieldRef.current);
      setComboLabel(null);
    }
    setPopFlash(true);
    const particleCount = state.lastPops.length >= 5 ? 6 : state.lastPops.length >= 3 ? 4 : 3;
    const burst: PopParticle[] = state.lastPops.flatMap((pop) => {
      const isOdd = pop.row % 2 === 1;
      const cx = pop.col * BUBBLE_SIZE + BUBBLE_RADIUS + (isOdd ? BUBBLE_RADIUS : 0);
      const cy = pop.row * BUBBLE_SIZE + BUBBLE_RADIUS;
      return Array.from({ length: particleCount }, () => ({
        id: particleIdRef.current++,
        xPct: ((cx + (Math.random() - 0.5) * 8) / FIELD_WIDTH) * 100,
        yPct: ((cy + (Math.random() - 0.5) * 8) / FIELD_HEIGHT) * 100,
        color: pop.color,
        life: 1,
      }));
    });
    setParticles((p) => [...p, ...burst].slice(-48));
    window.setTimeout(() => {
      setPopFlash(false);
      setComboLabel(null);
    }, 120);
  }, [state.lastPops]);

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
      playGameFeel("wrong", fieldRef.current);
    } else if (state.status === "won") {
      playGameFeel("goal", fieldRef.current);
    } else if (state.status === "stage-clear") {
      playGameFeel("correct", fieldRef.current);
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
    emitGameRetry(GAME_SLUG);
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
    playGameFeel("button", fieldRef.current);
    dispatch({ type: "fire" });
  }, [canPlayRef]);

  const aimX2 = SHOOTER_X + Math.sin(state.shooterAngle) * AIM_LINE_LENGTH;
  const aimY2 = SHOOTER_Y - Math.cos(state.shooterAngle) * AIM_LINE_LENGTH;

  return (
    <div className="standard-game-shell relative flex w-full flex-col items-center gap-3 overflow-hidden mx-auto">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ScoreBox label="Stage" value={state.stageIndex} />
          <span className="text-xs text-muted-foreground">
            {getBubbleStage(state.stageIndex).label}
          </span>
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
          maxWidth: "min(100%, 22rem)",
          maxHeight: "min(72vh, 32rem)",
          touchAction: "none",
        }}
        onPointerMove={handlePointerMove}
        onPointerDown={(e) => {
          e.preventDefault();
          handlePointerDown();
        }}
      >
        {comboLabel ? (
          <div className="pointer-events-none absolute inset-x-0 top-[18%] z-20 text-center text-lg font-bold text-primary drop-shadow">
            {comboLabel}
          </div>
        ) : null}
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
            onRestart={handleRetry}
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
        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}
      </div>

      <p className="text-xs text-muted-foreground">
        마우스로 조준하고 클릭하거나 스페이스바를 눌러 버블을 발사하세요. 같은
        색 버블 3개 이상을 모으면 터집니다.
      </p>
    </div>
  );
}
