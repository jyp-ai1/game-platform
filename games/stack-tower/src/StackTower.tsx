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
import { Button, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import { createInitialState, placeBlock, tick, type StackTowerState } from "./engine";

const GAME_SLUG = "stack-tower";
const TICK_MS = 32;

type Action = { type: "tick" } | { type: "place" } | { type: "restart" };

function reducer(state: StackTowerState, action: Action): StackTowerState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "tick":
      return tick(state);
    case "place":
      return placeBlock(state);
    default:
      return state;
  }
}

export function StackTowerGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLButtonElement>(null);
  const prevScoreRef = useRef(0);
  
  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      playGameFeel("pop", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    stageIndex: state.stack.length,
    fieldRef,
  });

  const diff = getGroupDifficulty(GAME_SLUG, state.stack.length);
  const tickMs = Math.max(16, TICK_MS / diff.speedMult);

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "over" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status !== "playing" || !canPlay) return;
    const id = setInterval(() => dispatch({ type: "tick" }), tickMs);
    return () => clearInterval(id);
  }, [state.status, canPlay, tickMs]);

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, reportScore]);


  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    prevScoreRef.current = 0;
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    prevScoreRef.current = 0;
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Height" value={state.stack.length} />
        <ScoreBox label="Score" value={state.score} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <button
        type="button"
        className="relative h-72 w-full max-w-sm touch-none select-none overflow-hidden rounded-xl bg-muted"
        ref={fieldRef}
        onClick={() => {
          if (canPlayRef.current && state.status === "playing") {
            playGameFeel("button", fieldRef.current);
            dispatch({ type: "place" });
          }
        }}
        aria-label="탭하여 블록 쌓기"
      >
        {state.stack.map((b, i) => (
          <div
            key={i}
            className="absolute bottom-0 h-4 bg-primary"
            style={{
              left: `${b.x}%`,
              width: `${b.width}%`,
              bottom: `${i * 16}px`,
              opacity: 0.5 + (i / state.stack.length) * 0.5,
            }}
          />
        ))}
        {state.status === "playing" ? (
          <div
            className="absolute h-4 bg-accent"
            style={{
              left: `${state.current.x}%`,
              width: `${state.current.width}%`,
              bottom: `${state.stack.length * 16}px`,
            }}
          />
        ) : null}
        {feel.bursts.length ? <GameFeelLayer bursts={feel.bursts} /> : null}
      </button>
      {state.status === "over" ? (
        <StandardGameOverOverlay
          message={`${state.stack.length} blocks!`}
          score={state.score}
          gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={feel.handleExit}
          onRetry={handleRetry}
          onRestart={handleRetry}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Stack Tower" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">움직이는 블록을 탭해서 쌓으세요.</p>
    </div>
  );
}
