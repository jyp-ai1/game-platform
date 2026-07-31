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
      reportScore(GAME_SLUG, computeScore(state.moves));
      clearSave(GAME_SLUG);
      playGameFeel("goal", fieldRef.current);
    }
  }, [state.status, state.moves, reportScore]);

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm justify-between">
        <ScoreBox label="Moves" value={state.moves} />
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={handleRetry}
        >
          <RotateCcw />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">조각을 탭해 빈 칸과 맞바꾸세요</p>
      <PuzzlePlayField fieldRef={fieldRef} bursts={feel.bursts} className="touch-none">
      <div
        className="grid w-full gap-1 rounded-xl p-2"
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
              if (canPlayRef.current) {
                playGameFeel("button", fieldRef.current);
                dispatch({ type: "tap", index: i });
              }
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
      </PuzzlePlayField>
      {state.status === "won" ? (
        <StandardGameOverOverlay
          message={`Complete! ${computeScore(state.moves)} pts`}
          score={computeScore(state.moves)}
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
        <ResumeDialog gameTitle="Jigsaw" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
    </div>
  );
}
