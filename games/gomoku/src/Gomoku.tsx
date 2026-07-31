"use client";

import {
  clearSave,
  CpuDifficultyPicker,
  emitGameRetry,
  playGameFeel,
  ResumeDialog,
  SaveIndicator,
  StandardGameOverOverlay,
  useAutoSave,
  useGameSDK,
  useHumanVsCpuFeel,
  useReadyCountdown,
  useResumableGame,
  type CpuDifficulty,
} from "@game-platform/game-sdk";
import { Button, cn, ReadyCountdown } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { computeScore, cpuMove, createInitialState, placeStone, type GomokuState } from "./engine";

const GAME_SLUG = "gomoku";

type Action =
  | { type: "place"; row: number; col: number }
  | { type: "cpu"; difficulty: CpuDifficulty }
  | { type: "restart" };

function reducer(state: GomokuState, action: Action): GomokuState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "place":
      return placeStone(state, action.row, action.col);
    case "cpu":
      return cpuMove(state, action.difficulty);
    default:
      return state;
  }
}

export function GomokuGame() {
  const { phase, initialState, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

  const [state, dispatch] = useReducer(reducer, initialState);
  const [difficulty, setDifficulty] = useState<CpuDifficulty>("normal");
  const { reportScore } = useGameSDK();
  const { fieldRef, feel, feelTap, FeelLayer } = useHumanVsCpuFeel(GAME_SLUG, {
    winner: state.winner,
    humanSide: 1,
    cpuSide: 2,
    difficulty,
    score: computeScore(state),
  });
  const humanTurn =
    canPlayRef.current && state.current === 1 && state.winner === null;

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.winner !== null ? null : state),
    [state]
  );

  useEffect(() => {
    if (!canPlayRef.current || state.winner !== null || state.current !== 2) return;
    const id = setTimeout(() => dispatch({ type: "cpu", difficulty }), 400);
    return () => clearTimeout(id);
  }, [state.current, state.winner, state.board, difficulty, canPlay]);

  useEffect(() => {
    if (state.winner !== null) {
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
    }
  }, [state.winner, reportScore]);

  const msg =
    state.winner === 1
      ? "You Win!"
      : state.winner === 2
        ? "CPU Wins!"
        : humanTurn
          ? "돌을 놓으세요 (5목)"
          : "CPU...";


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
      <div className="flex w-full max-w-sm items-center justify-between">
        <p className="text-sm text-muted-foreground">{msg}</p>
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={handleRetry}
        >
          <RotateCcw />
        </Button>
      </div>
      <CpuDifficultyPicker
        value={difficulty}
        onChange={setDifficulty}
        disabled={state.winner !== null}
      />
      <div
        ref={fieldRef}
        className="relative grid w-full max-w-sm grid-cols-9 gap-px rounded bg-amber-900/40 p-1"
      >
        {state.board.map((row, ri) =>
          row.map((cell, ci) => {
            const win = state.winningCells.some(([r, c]) => r === ri && c === ci);
            return (
              <button
                key={`${ri}-${ci}`}
                type="button"
                disabled={!humanTurn || cell !== 0}
                onClick={() => {
                  playGameFeel("button");
                  feelTap();
                  dispatch({ type: "place", row: ri, col: ci });
                }}
                className={cn(
                  "aspect-square rounded-sm bg-amber-100/20",
                  cell === 1 && "bg-neutral-900",
                  cell === 2 && "bg-neutral-100",
                  win && "ring-2 ring-amber-400"
                )}
              />
            );
          })
        )}
        <FeelLayer />
      </div>
      {state.winner !== null ? (
        <StandardGameOverOverlay
          message={msg}
          score={computeScore(state)}
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
        <ResumeDialog gameTitle="Gomoku" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
    </div>
  );
}
