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
  shootColumn,
  type BubbleShooterState,
  type ColorId,
} from "./engine";

const GAME_SLUG = "bubble-shooter";
const COLORS: Record<ColorId, string> = {
  1: "bg-red-500",
  2: "bg-blue-500",
  3: "bg-amber-400",
};

type Action = { type: "shoot"; col: number } | { type: "restart" };

function reducer(state: BubbleShooterState, action: Action): BubbleShooterState {
  if (action.type === "restart") return createInitialState();
  return shootColumn(state, action.col);
}

export function BubbleShooterGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "playing" ? state : null),
    [state]
  );

  useEffect(() => {
    if (state.status !== "playing") {
      reportScore(GAME_SLUG, computeScore(state.score, state.status));
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, reportScore]);

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Score" value={state.score} />
        <ScoreBox label="Shots" value={state.shots} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <div className="rounded-xl bg-muted p-2">
        {state.grid.map((row, ri) => (
          <div key={ri} className="flex gap-1">
            {row.map((cell, ci) => (
              <button
                key={`${ri}-${ci}`}
                type="button"
                onClick={() => {
                  if (phaseRef.current === "ready" && state.status === "playing") {
                    dispatch({ type: "shoot", col: ci });
                  }
                }}
                className={cn(
                  "m-0.5 size-8 rounded-full border border-background/30",
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
      </div>
      {state.status !== "playing" ? (
        <GameOverOverlay
          message={
            state.status === "won"
              ? `Clear! ${computeScore(state.score, state.status)} pts`
              : `Score ${state.score}`
          }
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Bubble Shooter" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">열을 탭해 버블을 쏘고 3개 이상 연결하세요.</p>
    </div>
  );
}
