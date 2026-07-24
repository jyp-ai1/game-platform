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
  JIGSAW_SIZE,
  tapTile,
  tileColor,
  type JigsawState,
} from "./engine";

const GAME_SLUG = "jigsaw";

type Action = { type: "tap"; index: number } | { type: "restart" };

function reducer(state: JigsawState, action: Action): JigsawState {
  if (action.type === "restart") return createInitialState();
  return tapTile(state, action.index);
}

export function JigsawGame() {
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
      <div className="flex w-full max-w-sm justify-between">
        <ScoreBox label="Moves" value={state.moves} />
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={() => dispatch({ type: "restart" })}
        >
          <RotateCcw />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">조각을 탭해 빈 칸과 맞바꾸세요</p>
      <div
        className="grid w-full max-w-xs gap-1 rounded-xl p-2"
        style={{
          gridTemplateColumns: `repeat(${JIGSAW_SIZE}, 1fr)`,
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        }}
      >
        {state.tiles.map((tile, i) => (
          <button
            key={i}
            type="button"
            disabled={tile === 0}
            onClick={() => {
              if (phaseRef.current === "ready") dispatch({ type: "tap", index: i });
            }}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg border-2 border-white/20 text-lg font-bold text-white shadow-inner",
              tile === 0 && "border-transparent bg-transparent shadow-none"
            )}
            style={tile ? { backgroundColor: tileColor(tile) } : undefined}
          >
            {tile || ""}
          </button>
        ))}
      </div>
      {state.status === "won" ? (
        <GameOverOverlay
          message={`Complete! ${computeScore(state.moves)} pts`}
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Jigsaw" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
    </div>
  );
}
