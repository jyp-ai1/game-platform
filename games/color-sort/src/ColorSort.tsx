"use client";

import {
  clearSave,
  ResumeDialog,
  SaveIndicator,
  useAutoSave,
  useGameSDK,
  useResumableGame,
} from "@game-platform/game-sdk";
import { Button, cn, GameOverOverlay, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useEffect, useReducer } from "react";

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
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
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
      <div className="flex justify-center gap-3">
        {state.tubes.map((tube, ti) => (
          <button
            key={ti}
            type="button"
            onClick={() => {
              if (phaseRef.current === "ready") dispatch({ type: "tap", index: ti });
            }}
            className={cn(
              "flex h-40 w-14 flex-col-reverse items-center rounded-b-lg border-2 border-foreground/20 bg-muted/50 p-1",
              state.selected === ti && "ring-2 ring-primary"
            )}
            aria-label={`튜브 ${ti + 1}`}
          >
            {tube.map((c, bi) => (
              <span key={bi} className={cn("mb-0.5 h-7 w-full rounded", COLORS[c])} />
            ))}
          </button>
        ))}
      </div>
      {state.status === "won" ? (
        <GameOverOverlay message="Sorted!" onRestart={() => dispatch({ type: "restart" })} />
      ) : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Color Sort" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">같은 색끼리 한 튜브에 모으세요.</p>
    </div>
  );
}
