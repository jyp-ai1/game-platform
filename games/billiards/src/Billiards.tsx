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
  standardFeelFromState,
  useStandardGameFeel,
  playGameFeel,
  GameFeelLayer,
} from "@game-platform/game-sdk";
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  BALL_R,
  BILLIARDS_H,
  BILLIARDS_W,
  computeScore,
  createInitialState,
  MAX_SHOTS,
  POCKETS,
  POCKET_R,
  shoot,
  tickAim,
  tickRolling,
  type BilliardsState,
} from "./engine";
import { playGameOverAudio, playStageClearAudio, primeGameAudio, resetGameAudioPrime } from "./game-audio-prime";

const GAME_SLUG = "billiards";
const TICK_MS = 32;

type Action = { type: "tick" } | { type: "shoot" } | { type: "restart" };

function reducer(state: BilliardsState, action: Action): BilliardsState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "tick":
      return state.status === "rolling" ? tickRolling(state) : tickAim(state);
    case "shoot":
      return shoot(state);
    default:
      return state;
  }
}

export function BilliardsGame() {
  const { phase, initialState, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, showCountdown, completeCountdown } = useReadyCountdown(phase);
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
  const prevPocketPulseRef = useRef(0);

  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      playGameFeel("goal", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

  useEffect(() => {
    if (state.pocketPulse > prevPocketPulseRef.current) {
      playGameFeel("pop", fieldRef.current);
    }
    prevPocketPulseRef.current = state.pocketPulse;
  }, [state.pocketPulse]);

  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    stageIndex: state.shots + 1,
    fieldRef,
  });

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "over" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status === "aiming" || state.status === "rolling") {
      if (!canPlay) return;
      const id = setInterval(() => dispatch({ type: "tick" }), TICK_MS);
      return () => clearInterval(id);
    }
  }, [state.status, canPlay]);

  useEffect(() => {
    if (state.status === "over" && prevStatusRef.current !== "over") {
      const allPocketed = state.balls.every((b) => b.pocketed);
      if (allPocketed) playStageClearAudio();
      else playGameOverAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status, state.balls]);

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, state.score, reportScore]);

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

  const allPocketed = state.balls.every((b) => b.pocketed);

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm justify-between">
        <ScoreBox label="Round" value={state.shots + 1} />
        <ScoreBox label="Score" value={state.score} />
        <ScoreBox label="Shots Left" value={MAX_SHOTS - state.shots} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <div
        className={cn(
          "relative w-full max-w-sm touch-none select-none overflow-hidden rounded-xl border-4 border-amber-900 bg-green-800",
          state.pocketPulse > 0 && "game-effect-shake"
        )}
        ref={fieldRef}
        style={{ aspectRatio: `${BILLIARDS_W}/${BILLIARDS_H}` }}
      >
        {POCKETS.map(([px, py], i) => (
          <div
            key={i}
            className={cn(
              "absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/80 transition-all",
              state.lastPocketFlash === px * 1000 + py && "scale-150 bg-amber-300/90 game-effect-flash"
            )}
            style={{ left: `${px}%`, top: `${py}%`, width: `${POCKET_R * 2}%`, height: `${POCKET_R * 2}%` }}
          />
        ))}
        {state.balls
          .filter((b) => !b.pocketed)
          .map((b) => (
            <div
              key={b.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 shadow-md transition-none"
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: `${BALL_R * 2}%`,
                height: `${BALL_R * 2}%`,
                backgroundColor: b.color,
              }}
            />
          ))}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg border border-white/60"
          style={{
            left: `${state.cueX}%`,
            top: `${state.cueY}%`,
            width: `${BALL_R * 2.2}%`,
            height: `${BALL_R * 2.2}%`,
          }}
        />
        {state.status === "aiming" ? (
          <div
            className="absolute h-0.5 origin-left bg-white/70"
            style={{
              left: `${state.cueX}%`,
              top: `${state.cueY}%`,
              width: `${state.power * 0.5}%`,
              transform: `rotate(${state.angle}deg)`,
            }}
          />
        ) : null}
        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}
      </div>
      <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${state.power}%` }} />
      </div>
      <Button
        disabled={state.status !== "aiming" || !canPlay}
        onClick={() => {
          primeGameAudio();
          playGameFeel("button", fieldRef.current);
          dispatch({ type: "shoot" });
        }}
      >
        Shoot!
      </Button>
      {state.status === "over" ? (
        <StandardGameOverOverlay
          message={allPocketed ? `Clear! Score ${state.score}` : `Score ${state.score}`}
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
        <ResumeDialog gameTitle="Billiards" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">조준 후 Shoot — 공을 포켓에 넣으세요.</p>
    </div>
  );
}
