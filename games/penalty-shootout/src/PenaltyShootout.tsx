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
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  computeRankingScore,
  createInitialState,
  shoot,
  type Direction,
  type PenaltyState,
} from "./engine";
import {
  playGameOverAudio,
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "penalty-shootout";

const SHOOT_KEYS: Record<string, Direction> = {
  ArrowLeft: "left",
  "1": "left",
  a: "left",
  ArrowUp: "center",
  "2": "center",
  w: "center",
  " ": "center",
  ArrowRight: "right",
  "3": "right",
  d: "right",
};

type Action = { type: "shoot"; dir: Direction } | { type: "restart" };

function reducer(state: PenaltyState, action: Action): PenaltyState {
  if (action.type === "restart") return createInitialState();
  return shoot(state, action.dir);
}

export function PenaltyShootoutGame() {
  const { phase, initialState, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const prevScoreRef = useRef(0);
  const prevStatusRef = useRef(state.status);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

  const stageIndex = state.round + 1;
  const diff = getGroupDifficulty(GAME_SLUG, stageIndex);

  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      const gain = state.score - prevScoreRef.current;
      playGameFeel(gain >= 25 ? "combo" : "goal", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    stageIndex,
    fieldRef,
  });

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "over" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status === "over" && prevStatusRef.current !== "over") {
      if (state.outcome === "win") playStageClearAudio();
      else playGameOverAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status, state.outcome]);

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, computeRankingScore(state));
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, state.score, reportScore]);

  function handleShoot(dir: Direction) {
    if (!canPlayRef.current || state.status !== "playing") return;
    primeGameAudio();
    playGameFeel("button", fieldRef.current);
    dispatch({ type: "shoot", dir });
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!canPlayRef.current) return;
      const dir = SHOOT_KEYS[event.key];
      if (!dir) return;
      event.preventDefault();
      handleShoot(dir);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canPlayRef, state.status]);

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

  const resultFlash =
    state.lastResult === "goal"
      ? "ring-4 ring-emerald-400/70 bg-emerald-500/10"
      : state.lastResult === "save"
        ? "ring-4 ring-sky-400/70 bg-sky-500/10"
        : "";

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="Goals" value={state.score} />
          <ScoreBox label="Saves" value={state.saves} />
          <ScoreBox
            label="Round"
            value={state.status === "playing" ? state.round + 1 : state.round}
          />
        </div>
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <div
        ref={fieldRef}
        className={cn(
          "relative flex w-full max-w-sm touch-none select-none flex-col gap-2 rounded-xl border-2 border-primary/30 bg-muted p-4 transition-all duration-300",
          resultFlash
        )}
        onPointerDown={() => primeGameAudio()}
      >
        <div className="mx-auto h-2 w-3/4 rounded bg-background" aria-hidden />
        <p className="text-center text-sm font-medium">
          {state.lastResult === "goal"
            ? "⚽ GOAL!"
            : state.lastResult === "save"
              ? "🧤 Saved"
              : state.suddenDeath
                ? "Sudden Death!"
                : `Round ${state.round + 1}/${state.maxRounds}`}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(["left", "center", "right"] as const).map((dir) => (
            <Button
              key={dir}
              variant="secondary"
              disabled={state.status !== "playing" || !canPlay}
              onClick={() => handleShoot(dir)}
              className={cn(state.lastResult && "opacity-80")}
            >
              {dir === "left" ? "← Left" : dir === "center" ? "Center" : "Right →"}
            </Button>
          ))}
        </div>
        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}

        {state.status === "over" ? (
          <StandardGameOverOverlay
            message={
              state.outcome === "win"
                ? state.suddenDeath
                  ? `Sudden death win! ${state.score} goals`
                  : `${state.score} goals — you win!`
                : state.suddenDeath
                  ? "Sudden death — saved!"
                  : `${state.score} goals — keeper wins`
            }
            score={computeRankingScore(state)}
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
          <ResumeDialog gameTitle="Penalty Shootout" onResume={onResume} onNewGame={handleNewGame} />
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        방향키 · 1/2/3 · 버튼으로 슛 방향을 고르세요. {diff.label}
      </p>
    </div>
  );
}
