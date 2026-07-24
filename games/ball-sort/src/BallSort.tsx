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
  computeScore,
  createInitialState,
  tapTube,
  type BallId,
  type BallSortState,
} from "./engine";

const GAME_SLUG = "ball-sort";
const LABELS: Record<BallId, string> = { 1: "🔴", 2: "🔵", 3: "🟢", 4: "🟡" };

type Action = { type: "tap"; index: number } | { type: "restart" };

function reducer(state: BallSortState, action: Action): BallSortState {
  if (action.type === "restart") return createInitialState();
  return tapTube(state, action.index);
}

export function BallSortGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "won" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status === "won") {
      reportScore(GAME_SLUG, computeScore(state.moves));
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.moves, reportScore]);

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Moves" value={state.moves} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <div className="flex justify-center gap-2">
        {state.tubes.map((tube, ti) => (
          <button
            key={ti}
            type="button"
            onClick={() => {
              if (canPlayRef.current) dispatch({ type: "tap", index: ti });
            }}
            className={cn(
              "flex h-36 w-12 flex-col-reverse items-center rounded-b-full border-2 border-foreground/20 bg-muted/30",
              state.selected === ti && "ring-2 ring-primary"
            )}
          >
            {tube.map((b, bi) => (
              <span key={bi} className="text-lg leading-none">
                {LABELS[b]}
              </span>
            ))}
          </button>
        ))}
      </div>
      {state.status === "won" ? (
        <GameOverOverlay
          message="Complete!"
          score={computeScore(state.moves)}
          gameSlug={GAME_SLUG}
          onRetry={() => emitGameRetry(GAME_SLUG)}
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Ball Sort" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">공을 같은 튜브에 정렬하세요.</p>
    </div>
  );
}
