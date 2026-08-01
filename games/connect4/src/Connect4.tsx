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

import {
  computeScore,
  cpuMove,
  createInitialState,
  dropDisc,
  type Connect4State,
} from "./engine";

const GAME_SLUG = "connect4";
const CPU_DELAY = 450;

type Action =
  | { type: "drop"; col: number }
  | { type: "cpu"; difficulty: CpuDifficulty }
  | { type: "restart" };

function reducer(state: Connect4State, action: Action): Connect4State {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "drop":
      return dropDisc(state, action.col);
    case "cpu":
      return cpuMove(state, action.difficulty);
    default:
      return state;
  }
}

export function Connect4Game() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
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

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.winner !== null ? null : state),
    [state]
  );

  useEffect(() => {
    if (!canPlayRef.current || state.winner !== null || state.current !== 2) return;
    const id = setTimeout(() => dispatch({ type: "cpu", difficulty }), CPU_DELAY);
    return () => clearTimeout(id);
  }, [state.current, state.winner, difficulty, canPlay]);

  useEffect(() => {
    if (state.winner !== null) {
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
    }
  }, [state.winner, reportScore]);

  const humanTurn =
    canPlayRef.current && state.current === 1 && state.winner === null;
  const msg =
    state.winner === 1
      ? "You Win!"
      : state.winner === 2
        ? "CPU Wins!"
        : state.winner === "draw"
          ? "Draw"
          : humanTurn
            ? "열을 탭해 디스크를 놓으세요"
            : "CPU 차례...";

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{msg}</p>
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <CpuDifficultyPicker
        value={difficulty}
        onChange={setDifficulty}
        disabled={state.winner !== null}
      />
      <div ref={fieldRef} className="flex w-full max-w-sm flex-col gap-1">
        <div className="flex gap-1">
          {Array.from({ length: 7 }, (_, col) => (
            <button
              key={col}
              type="button"
              disabled={!humanTurn}
              aria-label={`열 ${col + 1}`}
              onClick={() => {
                playGameFeel("button");
                feelTap();
                dispatch({ type: "drop", col });
              }}
              className="flex min-h-11 min-w-11 flex-1 items-center justify-center rounded bg-muted py-3 text-xs transition-transform duration-150 active:scale-95 hover:bg-primary/20 disabled:opacity-40"
            >
              ▼
            </button>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 rounded-xl bg-primary/20 p-2">
          {state.board.map((row, ri) =>
            row.map((cell, ci) => {
              const win = state.winningCells.some(([r, c]) => r === ri && c === ci);
              return (
                <div
                  key={`${ri}-${ci}`}
                  className={cn(
                    "aspect-square rounded-full bg-background/80",
                    cell === 1 && "bg-primary",
                    cell === 2 && "bg-destructive",
                    win && "ring-2 ring-amber-400"
                  )}
                />
              );
            })
          )}
        </div>
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
        <ResumeDialog gameTitle="Connect 4" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
    </div>
  );
}
