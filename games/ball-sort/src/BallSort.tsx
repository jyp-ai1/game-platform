"use client";

import {
  clearSave,
  emitGameRetry,
  feelWithScore,
  PuzzlePlayField,
  playGameFeel,
  ResumeDialog,
  SaveIndicator,
  StandardGameOverOverlay,
  useAutoSave,
  useGameSDK,
  useReadyCountdown,
  useResumableGame,
  useStandardGameFeel,
} from "@game-platform/game-sdk";
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useEffect, useReducer, useRef } from "react";

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
  const { phase, initialState, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const score = computeScore(state.moves);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...feelWithScore(state as unknown as Record<string, unknown>, score),
    fieldRef,
  });

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "won" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status === "won") {
      playGameFeel("goal", fieldRef.current);
      reportScore(GAME_SLUG, score);
      clearSave(GAME_SLUG);
    }
  }, [state.status, score, reportScore]);

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative mx-auto flex w-full flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Moves" value={state.moves} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <PuzzlePlayField fieldRef={fieldRef} bursts={feel.bursts} className="touch-none">
        <div className="flex w-full justify-center gap-1 sm:gap-2">
          {state.tubes.map((tube, ti) => (
            <button
              key={ti}
              type="button"
              onClick={() => {
                if (canPlayRef.current) {
                  playGameFeel("button", fieldRef.current);
                  dispatch({ type: "tap", index: ti });
                }
              }}
              className={cn(
                "flex h-32 w-[2.25rem] flex-col-reverse items-center rounded-b-full border-2 border-foreground/20 bg-muted/30 sm:h-36 sm:w-12",
                state.selected === ti && "ring-2 ring-primary"
              )}
            >
              {tube.map((b, bi) => (
                <span key={bi} className="text-base leading-none sm:text-lg">
                  {LABELS[b]}
                </span>
              ))}
            </button>
          ))}
        </div>
      </PuzzlePlayField>
      {state.status === "won" ? (
        <StandardGameOverOverlay
          message="Complete!"
          score={score}
          gameSlug={GAME_SLUG}
          isNewBest={feel.isNewBest}
          bestRecordDelta={feel.bestRecordDelta}
          onExit={feel.handleExit}
          onRetry={handleRetry}
          onRestart={handleRetry}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Ball Sort" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">공을 같은 튜브에 정렬하세요.</p>
    </div>
  );
}
