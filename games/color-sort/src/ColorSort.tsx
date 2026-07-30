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
  type ColorId,
  type ColorSortState,
} from "./engine";

const GAME_SLUG = "color-sort";
const COLORS: Record<ColorId, string> = { 1: "bg-red-500", 2: "bg-blue-500", 3: "bg-green-500" };

type Action = { type: "tap"; index: number } | { type: "restart" };

function reducer(state: ColorSortState, action: Action): ColorSortState {
  if (action.type === "restart") return createInitialState();
  return tapTube(state, action.index);
}

export function ColorSortGame() {
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

  return (
    <div className="standard-game-shell relative mx-auto flex w-full flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Moves" value={state.moves} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <PuzzlePlayField fieldRef={fieldRef} bursts={feel.bursts} className="touch-none">
        <div className="flex w-full justify-center gap-2">
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
                "flex h-36 w-11 flex-col-reverse items-center rounded-b-lg border-2 border-foreground/20 bg-muted/50 p-1 sm:h-40 sm:w-14",
                state.selected === ti && "ring-2 ring-primary"
              )}
              aria-label={`튜브 ${ti + 1}`}
            >
              {tube.map((c, bi) => (
                <span key={bi} className={cn("mb-0.5 h-6 w-full rounded sm:h-7", COLORS[c])} />
              ))}
            </button>
          ))}
        </div>
      </PuzzlePlayField>
      {state.status === "won" ? (
        <StandardGameOverOverlay
          message="Sorted!"
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
        <ResumeDialog gameTitle="Color Sort" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">같은 색끼리 한 튜브에 모으세요.</p>
    </div>
  );
}
