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
import { useEffect, useCallback, useReducer, useRef } from "react";

import {
  createInitialState,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  fireHook,
  goalForLevel,
  HOOK_ORIGIN_X,
  HOOK_ORIGIN_Y,
  hookTip,
  ITEM_SIZE,
  step,
  type GoldMinerState,
  type ItemType,
} from "./engine";
import { playGameOverAudio, playStageClearAudio, primeGameAudio, resetGameAudioPrime } from "./game-audio-prime";

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
  const prevLevelRef = useRef(state.level);
  const prevStatusRef = useRef(state.status);
  
  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      const gain = state.score - prevScoreRef.current;
      playGameFeel(gain >= 25 ? "combo" : "explosion", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

  useEffect(() => {
    if (state.level > prevLevelRef.current) {
      playStageClearAudio();
      playGameFeel("goal", fieldRef.current);
    }
    prevLevelRef.current = state.level;
  }, [state.level]);

  const level = state.level;
  const levelTarget = goalForLevel(level);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    stageIndex: level,
    muteScoreGain: true,
    fieldRef,
  });
  const diff = getGroupDifficulty(GAME_SLUG, level);
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

      if (canPlayRef.current && stateRef.current.status === "playing") {
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
    if (state.status === "over" && prevStatusRef.current !== "over") {
      playGameOverAudio();
    } else if (state.status === "won" && prevStatusRef.current !== "won") {
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
      if (event.key === " ") {
        event.preventDefault();
        primeGameAudio();
        playGameFeel("button", fieldRef.current);
        dispatch({ type: "fire" });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canPlayRef]);

  function handleFire() {
    if (!canPlayRef.current) {
      return;
    }
    primeGameAudio();
    playGameFeel("button", fieldRef.current);
    dispatch({ type: "fire" });
  }

  const tip = hookTip(state.hookAngle, state.hookLength);


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
          <ScoreBox label="Level" value={level} />
          <ScoreBox label="Goal" value={levelTarget} />
          <ScoreBox label="Time" value={Math.ceil(state.timeLeft)} />
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
        className="relative w-full max-w-[min(100%,20.5rem)] touch-none select-none overflow-hidden rounded-xl bg-amber-950/30 transition-transform duration-150 active:scale-[0.99]"
        ref={fieldRef}
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
            stroke={state.hookState === "retracting" ? "#fbbf24" : "#a8a29e"}
            strokeWidth={state.hookState === "retracting" ? 4 : 3}
            strokeDasharray={state.hookState === "retracting" ? "6 4" : undefined}
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

        {state.status === "over" || state.status === "won" ? (
          <StandardGameOverOverlay
            message={state.status === "won" ? "You Win!" : "Time's Up!"}
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
            gameTitle="Gold Miner"
            onResume={onResume}
            onNewGame={handleNewGame}
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
