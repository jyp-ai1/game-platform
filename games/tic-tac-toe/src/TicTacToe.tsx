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
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  cpuMove,
  createInitialState,
  playMove,
  type TicTacToeState,
} from "./engine";
import {
  playGameOverAudio,
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "tic-tac-toe";
const CPU_MOVE_DELAY_MS = 500;
const WIN_SCORE = 100;

type GameMode = "cpu" | "local";

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

function statusMessage(state: TicTacToeState, mode: GameMode): string {
  if (state.winner === "X") return mode === "local" ? "X Wins!" : "You Win!";
  if (state.winner === "O") return mode === "local" ? "O Wins!" : "CPU Wins!";
  if (state.winner === "draw") return "Draw";
  if (mode === "local") return `${state.currentPlayer} 차례`;
  return state.currentPlayer === "X" ? "당신의 차례입니다" : "CPU가 생각 중...";
}

export function TicTacToeGame() {
  const { phase, initialState, onResume, onNewGame } = useResumableGame(
    GAME_SLUG,
    createInitialState
  );
  const [state, dispatch] = useReducer(reducer, initialState);
  const [matchRound, setMatchRound] = useState(1);
  const [mode, setMode] = useState<GameMode>("cpu");
  const [difficulty, setDifficulty] = useState<CpuDifficulty>("normal");
  const prevStatusRef = useRef(state.winner);
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
    if (mode !== "cpu" || !canPlayRef.current || state.winner !== null || state.currentPlayer !== "O") {
      return;
    }
    const id = setTimeout(
      () => dispatch({ type: "cpuMove", difficulty }),
      CPU_MOVE_DELAY_MS
    );
    return () => clearTimeout(id);
  }, [mode, state.currentPlayer, state.winner, canPlay, difficulty]);

  useEffect(() => {
    if (state.winner !== null && prevStatusRef.current === null) {
      if (mode === "cpu" && state.winner === "X") {
        playStageClearAudio();
      } else if (mode === "cpu" && state.winner !== "draw") {
        playGameOverAudio();
      }
    }
    prevStatusRef.current = state.winner;
  }, [state.winner, mode]);

  useEffect(() => {
    if (mode === "cpu" && state.winner === "X") {
      reportScore(GAME_SLUG, WIN_SCORE);
    }
    if (state.winner !== null) {
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.winner, reportScore, mode]);

  const isHumanTurn =
    canPlay && state.winner === null && (mode === "local" || state.currentPlayer === "X");

  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    resetGameAudioPrime();
    if (state.winner !== null) setMatchRound((r) => r + 1);
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    resetGameAudioPrime();
    if (state.winner !== null) setMatchRound((r) => r + 1);
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="Round" value={matchRound} />
          <p className="text-sm font-medium text-muted-foreground self-center">
            {statusMessage(state, mode)}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={handleRetry}
        >
          <RotateCcw />
        </Button>
      </div>

      <div className="flex w-full max-w-sm gap-2">
        <Button
          variant={mode === "cpu" ? "default" : "outline"}
          size="sm"
          disabled={state.winner !== null}
          onClick={() => setMode("cpu")}
        >
          vs CPU
        </Button>
        <Button
          variant={mode === "local" ? "default" : "outline"}
          size="sm"
          disabled={state.winner !== null}
          onClick={() => setMode("local")}
        >
          2 Player
        </Button>
      </div>

      {mode === "cpu" ? (
        <CpuDifficultyPicker
          value={difficulty}
          onChange={setDifficulty}
          disabled={state.winner !== null}
        />
      ) : null}

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
                primeGameAudio();
                playGameFeel("button");
                feelTap();
                dispatch({ type: "playMove", index });
              }}
              disabled={!isHumanTurn || cell !== null}
              aria-label={cell ? `칸 ${index + 1}: ${cell}` : `칸 ${index + 1}`}
              className={cn(
                "flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-background text-4xl font-bold transition-transform duration-150 active:scale-95",
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
            message={statusMessage(state, mode)}
            score={mode === "cpu" && state.winner === "X" ? WIN_SCORE : undefined}
            gameSlug={GAME_SLUG}
            isNewBest={feel.isNewBest}
            bestRecordDelta={feel.bestRecordDelta}
            onExit={handleExit}
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
        {mode === "local"
          ? "같은 기기에서 X와 O가 번갈아 둡니다."
          : "당신은 X입니다. CPU를 상대로 승리해보세요."}
      </p>
    </div>
  );
}
