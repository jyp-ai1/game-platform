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
import { useEffect, useCallback, useReducer, useRef, useState } from "react";

import {
  computeScore,
  createInitialState,
  shootColumn,
  type BubbleShooterState,
  type ColorId,
} from "./engine";
import { getBubbleShooterStage } from "./bubble-shooter-stage-config";
import {
  playGameOverAudio,
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "bubble-shooter";
const COLORS: Record<ColorId, string> = {
  1: "bg-red-500",
  2: "bg-blue-500",
  3: "bg-amber-400",
};

type Action = { type: "shoot"; col: number } | { type: "restart" } | { type: "nextStage" };

function reducer(state: BubbleShooterState, action: Action): BubbleShooterState {
  if (action.type === "restart") return createInitialState();
  if (action.type === "nextStage") {
    return createInitialState(state.stageIndex + 1, state.score);
  }
  return shootColumn(state, action.col);
}

export function BubbleShooterGame() {
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
  const prevStatusRef = useRef(state.status);
  const stageIndex = state.stageIndex;
  const diff = getGroupDifficulty(GAME_SLUG, stageIndex);
  
  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      const gain = state.score - prevScoreRef.current;
      playGameFeel(gain >= 15 * diff.speedMult ? "combo" : "pop", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score, diff.speedMult]);

  useEffect(() => {
    if (state.status === "won" && prevStatusRef.current !== "won") {
      playStageClearAudio();
    } else if (state.status === "stage-clear" && prevStatusRef.current !== "stage-clear") {
      playStageClearAudio();
    } else if (state.status === "over" && prevStatusRef.current !== "over") {
      playGameOverAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  const stageDef = getBubbleShooterStage(stageIndex);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    stageIndex,
    muteScoreGain: true,
    fieldRef,
  });
  const [aimCol, setAimCol] = useState<number | null>(null);

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "playing" ? state : null),
    [state]
  );

  useEffect(() => {
    if (state.status === "over" || state.status === "won") {
      reportScore(GAME_SLUG, computeScore(state.score, state.status));
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

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-3 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <ScoreBox label="Score" value={state.score} />
          <ScoreBox label="Stage" value={`${stageIndex} · ${stageDef.label}`} />
          <ScoreBox label="Shots" value={`${state.shots}/${state.maxShots}`} />
          <ScoreBox label="Best" value={feel.bestScore} />
        </div>
        <Button variant="outline" size="icon" className="min-h-11 min-w-11 shrink-0" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <div
        ref={fieldRef}
        className="relative w-full max-w-[min(100%,20.5rem)] touch-none select-none rounded-xl bg-muted p-2"
        onPointerMove={(event) => {
          const field = fieldRef.current;
          if (!field) return;
          const rect = field.getBoundingClientRect();
          const col = Math.floor(
            ((event.clientX - rect.left) / rect.width) * state.grid[0]!.length
          );
          setAimCol(Math.max(0, Math.min(state.grid[0]!.length - 1, col)));
        }}
        onPointerLeave={() => setAimCol(null)}
      >
        {aimCol !== null && state.status === "playing" ? (
          <div
            className="pointer-events-none absolute bottom-10 top-2 w-0.5 bg-foreground/30"
            style={{ left: `${((aimCol + 0.5) / state.grid[0]!.length) * 100}%` }}
          />
        ) : null}
        {state.grid.map((row, ri) => (
          <div key={ri} className="flex gap-1">
            {row.map((cell, ci) => (
              <button
                key={`${ri}-${ci}`}
                type="button"
                onClick={() => {
                  if (canPlayRef.current && state.status === "playing") {
                    primeGameAudio();
                    playGameFeel("button", fieldRef.current);
                    dispatch({ type: "shoot", col: ci });
                  }
                }}
                className={cn(
                  "m-0.5 min-h-11 min-w-11 rounded-full border border-background/30 transition-transform duration-150 active:scale-95",
                  cell ? COLORS[cell] : "bg-background/20"
                )}
                aria-label={cell ? `열 ${ci + 1}` : `빈 칸 열 ${ci + 1}`}
              />
            ))}
          </div>
        ))}
        <div className="mt-2 flex justify-center">
          <span className={cn("size-10 rounded-full border-2 border-foreground/30", COLORS[state.next])} />
        </div>
        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}
      </div>
      {state.status === "stage-clear" ? (
        <StandardGameOverOverlay
          variant="stage-clear"
          stageLabel={`${stageDef.label} — Stage ${stageIndex} Clear`}
          score={state.score}
          gameSlug={GAME_SLUG}
          isNewBest={feel.isNewBest}
          bestRecordDelta={feel.bestRecordDelta}
          onExit={handleExit}
          onRetry={handleRetry}
          onRestart={handleRetry}
          onNextStage={() => dispatch({ type: "nextStage" })}
        />
      ) : null}
      {state.status === "over" || state.status === "won" ? (
        <StandardGameOverOverlay
          message={
            state.status === "won"
              ? `Clear! ${computeScore(state.score, state.status)} pts`
              : `Score ${state.score}`
          }
          score={computeScore(state.score, state.status)}
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
        <ResumeDialog gameTitle="Bubble Shooter" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">열을 탭해 버블을 쏘고 3개 이상 연결하세요.</p>
    </div>
  );
}
