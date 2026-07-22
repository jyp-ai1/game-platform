"use client";

import {
  clearSave,
  ResumeDialog,
  SaveIndicator,
  useAutoSave,
  useGameSDK,
  useResumableGame,
} from "@game-platform/game-sdk";
import { Button, GameOverOverlay, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useEffect, useReducer, useRef } from "react";

import {
  createInitialState,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  fireHook,
  HOOK_ORIGIN_X,
  HOOK_ORIGIN_Y,
  hookTip,
  ITEM_SIZE,
  step,
  type GoldMinerState,
  type ItemType,
} from "./engine";

const GAME_SLUG = "gold-miner";
const MAX_DT = 0.05;

const ITEM_COLORS: Record<ItemType, string> = {
  gold: "#facc15",
  rock: "#78716c",
  diamond: "#67e8f9",
};

type Action =
  | { type: "step"; dt: number }
  | { type: "fire" }
  | { type: "restart" };

function reducer(state: GoldMinerState, action: Action): GoldMinerState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "fire":
      return fireHook(state);
    case "step":
      return step(state, action.dt);
    default:
      return state;
  }
}

function toPercent(x: number, y: number): { left: string; top: string } {
  return {
    left: `${(x / FIELD_WIDTH) * 100}%`,
    top: `${(y / FIELD_HEIGHT) * 100}%`,
  };
}

export function GoldMinerGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "over" ? null : state),
    [state]
  );

  useEffect(() => {
    function loop(time: number) {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }
      const dt = Math.min(MAX_DT, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;

      if (phaseRef.current === "ready" && stateRef.current.status === "playing") {
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
  }, [phaseRef]);

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, reportScore]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (phaseRef.current !== "ready") {
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        dispatch({ type: "fire" });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phaseRef]);

  function handleFire() {
    if (phaseRef.current !== "ready") {
      return;
    }
    dispatch({ type: "fire" });
  }

  const tip = hookTip(state.hookAngle, state.hookLength);

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="Score" value={state.score} />
          <ScoreBox label="Time" value={Math.ceil(state.timeLeft)} />
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
        className="relative w-full max-w-sm touch-none select-none overflow-hidden rounded-xl bg-amber-950/30"
        style={{ aspectRatio: `${FIELD_WIDTH} / ${FIELD_HEIGHT}` }}
        onPointerDown={handleFire}
      >
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <line
            x1={HOOK_ORIGIN_X}
            y1={HOOK_ORIGIN_Y}
            x2={tip.x}
            y2={tip.y}
            stroke="#a8a29e"
            strokeWidth={3}
          />
        </svg>

        <div
          className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
          style={toPercent(HOOK_ORIGIN_X, HOOK_ORIGIN_Y)}
        />
        <div
          className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
          style={toPercent(tip.x, tip.y)}
        />

        {state.items.map((item, index) =>
          item.collected ? null : (
            <div
              key={index}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/20"
              style={{
                ...toPercent(item.x, item.y),
                width: `${(ITEM_SIZE / FIELD_WIDTH) * 100}%`,
                aspectRatio: "1 / 1",
                backgroundColor: ITEM_COLORS[item.type],
              }}
            />
          )
        )}

        {state.status === "over" ? (
          <GameOverOverlay
            message="Time's Up!"
            onRestart={() => dispatch({ type: "restart" })}
          />
        ) : null}

        {phase === "resume-prompt" ? (
          <ResumeDialog
            gameTitle="Gold Miner"
            onResume={onResume}
            onNewGame={onNewGame}
          />
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        스페이스바(또는 탭)로 훅을 발사해 광물을 캐내세요. 무거울수록 천천히
        올라옵니다.
      </p>
    </div>
  );
}
