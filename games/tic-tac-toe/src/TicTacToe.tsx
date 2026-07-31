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
  cpuMove,
  createInitialState,
  playMove,
  type TicTacToeState,
} from "./engine";

const GAME_SLUG = "tic-tac-toe";
const CPU_MOVE_DELAY_MS = 500;
const WIN_SCORE = 100;

type Action =
  | { type: "playMove"; index: number }
  | { type: "cpuMove"; difficulty: CpuDifficulty }
  | { type: "restart" };

function reducer(state: TicTacToeState, action: Action): TicTacToeState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "playMove":
      return playMove(state, action.index);
    case "cpuMove":
      return cpuMove(state, action.difficulty);
    default:
      return state;
  }
}

function statusMessage(state: TicTacToeState): string {
  if (state.winner === "X") return "You Win!";
  if (state.winner === "O") return "CPU Wins!";
  if (state.winner === "draw") return "Draw";
  return state.currentPlayer === "X" ? "당신의 차례입니다" : "CPU가 생각 중...";
}

export function TicTacToeGame() {
  const { phase, initialState, onResume, onNewGame } = useResumableGame(
    GAME_SLUG,
    createInitialState
  );
  const [state, dispatch] = useReducer(reducer, initialState);
  const [difficulty, setDifficulty] = useState<CpuDifficulty>("normal");
  const { reportScore } = useGameSDK();
  const { fieldRef, feel, feelTap, FeelLayer } = useHumanVsCpuFeel(GAME_SLUG, {
    winner: state.winner,
    humanSide: "X",
    cpuSide: "O",
    difficulty,
    score: state.winner === "X" ? WIN_SCORE : 0,
  });
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);


  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.winner !== null ? null : state),
    [state]
  );

  useEffect(() => {
    if (!canPlayRef.current || state.winner !== null || state.currentPlayer !== "O") {
      return;
    }
    const id = setTimeout(
      () => dispatch({ type: "cpuMove", difficulty }),
      CPU_MOVE_DELAY_MS
    );
    return () => clearTimeout(id);
  }, [state.currentPlayer, state.winner, canPlay, difficulty]);

  useEffect(() => {
    if (state.winner === "X") {
      reportScore(GAME_SLUG, WIN_SCORE);
    }
    if (state.winner !== null) {
      clearSave(GAME_SLUG);
    }
  }, [state.winner, reportScore]);

  const isHumanTurn =
    canPlay && state.currentPlayer === "X" && state.winner === null;

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
        <p className="text-sm font-medium text-muted-foreground">
          {statusMessage(state)}
        </p>
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
        className="relative grid aspect-square w-full max-w-sm grid-cols-3 gap-2 rounded-xl bg-muted p-2"
      >
        {state.board.map((cell, index) => {
          const isWinningCell = state.winningLine?.includes(index) ?? false;
          return (
            <button
              key={index}
              type="button"
              onClick={() => {
                playGameFeel("button");
                feelTap();
                dispatch({ type: "playMove", index });
              }}
              disabled={!isHumanTurn || cell !== null}
              aria-label={cell ? `칸 ${index + 1}: ${cell}` : `칸 ${index + 1}`}
              className={cn(
                "flex items-center justify-center rounded-lg bg-background text-4xl font-bold transition-colors",
                !cell && isHumanTurn && "hover:bg-muted-foreground/20",
                isWinningCell && "bg-primary/30",
                cell === "X" && "text-primary",
                cell === "O" && "text-destructive"
              )}
            >
              {cell}
            </button>
          );
        })}

        {state.winner !== null ? (
          <StandardGameOverOverlay
            message={statusMessage(state)}
            score={state.winner === "X" ? WIN_SCORE : undefined}
            gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={feel.handleExit}
            onRetry={handleRetry}
            onRestart={handleRetry}
          />
        ) : null}
        {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}
        <FeelLayer />
      </div>

      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Tic Tac Toe" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}

      <p className="text-xs text-muted-foreground">
        당신은 X입니다. CPU를 상대로 승리해보세요.
      </p>
    </div>
  );
}
