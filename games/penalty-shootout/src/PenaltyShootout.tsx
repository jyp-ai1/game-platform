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
import { Button, cn, GameOverOverlay, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useEffect, useReducer } from "react";

import {
  computeRankingScore,
  createInitialState,
  shoot,
  type Direction,
  type PenaltyState,
} from "./engine";

const GAME_SLUG = "penalty-shootout";

type Action = { type: "shoot"; dir: Direction } | { type: "restart" };

function reducer(state: PenaltyState, action: Action): PenaltyState {
  if (action.type === "restart") return createInitialState();
  return shoot(state, action.dir);
}

export function PenaltyShootoutGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "over" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, computeRankingScore(state));
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, reportScore]);

  function handleShoot(dir: Direction) {
    if (!canPlayRef.current || state.status !== "playing") return;
    dispatch({ type: "shoot", dir });
  }

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="Goals" value={state.score} />
          <ScoreBox
            label="Round"
            value={state.status === "playing" ? state.round + 1 : state.round}
          />
        </div>
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <div className="relative flex w-full max-w-sm flex-col gap-2 rounded-xl border-2 border-primary/30 bg-muted p-4">
        <div className="mx-auto h-2 w-3/4 rounded bg-background" aria-hidden />
        <p className="text-center text-sm font-medium">
          {state.lastResult === "goal"
            ? "⚽ GOAL!"
            : state.lastResult === "save"
              ? "🧤 Saved"
              : `Round ${state.round + 1}/${state.maxRounds}`}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(["left", "center", "right"] as const).map((dir) => (
            <Button
              key={dir}
              variant="secondary"
              disabled={state.status !== "playing" || !canPlayRef.current}
              onClick={() => handleShoot(dir)}
              className={cn(state.lastResult && "opacity-80")}
            >
              {dir === "left" ? "← Left" : dir === "center" ? "Center" : "Right →"}
            </Button>
          ))}
        </div>
      </div>
      {state.status === "over" ? (
        <GameOverOverlay
          message={`${state.score} goals!`}
          score={computeRankingScore(state)}
          gameSlug={GAME_SLUG}
          onRetry={() => emitGameRetry(GAME_SLUG)}
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Penalty Shootout" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">슛 방향을 고르세요. 골키퍼는 랜덤입니다.</p>
    </div>
  );
}
