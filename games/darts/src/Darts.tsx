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
import { useEffect, useReducer } from "react";

import { createInitialState, throwDart, type DartsState } from "./engine";

const GAME_SLUG = "darts";

type Action =
  | { type: "throw"; xPct: number; yPct: number }
  | { type: "restart" };

function reducer(state: DartsState, action: Action): DartsState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "throw":
      return throwDart(state, action.xPct, action.yPct);
    default:
      return state;
  }
}

export function DartsGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "over" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, reportScore]);

  function handleBoardClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!canPlayRef.current || state.status !== "playing") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    dispatch({ type: "throw", xPct, yPct });
  }

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="Score" value={state.score} />
          <ScoreBox label="Throws" value={state.throwsLeft} />
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
      <button
        type="button"
        onClick={handleBoardClick}
        disabled={state.status !== "playing" || !canPlayRef.current}
        aria-label="다트판 — 클릭하여 던지기"
        className="relative aspect-square w-full max-w-sm rounded-full border-4 border-primary/30 bg-muted"
      >
        {[48, 42, 32, 22, 12, 6].map((r, i) => (
          <span
            key={r}
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-foreground/20"
            style={{
              width: `${r * 2}%`,
              height: `${r * 2}%`,
              transform: "translate(-50%, -50%)",
              opacity: 0.15 + i * 0.05,
            }}
          />
        ))}
        <span className="pointer-events-none absolute left-1/2 top-1/2 size-[8%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive" />
        {state.lastPoints !== null ? (
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-sm font-bold text-primary">
            +{state.lastPoints}
          </span>
        ) : null}
      </button>
      {state.status === "over" ? (
        <GameOverOverlay
          message={`Finished! ${state.score} pts`}
          score={state.score}
          gameSlug={GAME_SLUG}
          onRetry={() => emitGameRetry(GAME_SLUG)}
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Darts" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">다트판을 탭해서 10번 던지세요.</p>
    </div>
  );
}
