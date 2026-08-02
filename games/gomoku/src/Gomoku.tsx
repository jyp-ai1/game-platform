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

import { computeScore, cpuMove, createInitialState, placeStone, type GomokuState } from "./engine";
import {
  playGameOverAudio,
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "gomoku";

type GameMode = "cpu" | "local";

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
  const [mode, setMode] = useState<GameMode>("cpu");
  const [matchRound, setMatchRound] = useState(1);
  const [difficulty, setDifficulty] = useState<CpuDifficulty>("normal");
  const prevStatusRef = useRef(state.winner);
  const { reportScore } = useGameSDK();
  const { fieldRef, feel, feelTap, FeelLayer } = useHumanVsCpuFeel(GAME_SLUG, {
    winner: state.winner,
    humanSide: 1,
    cpuSide: 2,
    difficulty,
    score: computeScore(state),
  });
  const humanTurn =
    canPlayRef.current && state.winner === null && (mode === "local" || state.current === 1);

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.winner !== null ? null : state),
    [state]
  );

  useEffect(() => {
    if (mode !== "cpu" || !canPlayRef.current || state.winner !== null || state.current !== 2) return;
    const id = setTimeout(() => dispatch({ type: "cpu", difficulty }), 400);
    return () => clearTimeout(id);
  }, [mode, state.current, state.winner, state.board, difficulty, canPlay]);

  useEffect(() => {
    if (state.winner !== null && prevStatusRef.current === null) {
      if (mode === "cpu" && state.winner === 1) {
        playStageClearAudio();
      } else if (mode === "cpu" && state.winner !== "draw") {
        playGameOverAudio();
      }
    }
    prevStatusRef.current = state.winner;
  }, [state.winner, mode]);

  useEffect(() => {
    if (state.winner !== null && mode === "cpu") {
      reportScore(GAME_SLUG, computeScore(state));
    }
    if (state.winner !== null) {
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.winner, reportScore, mode]);

  const msg =
    state.winner === 1
      ? mode === "local"
        ? "Black Wins!"
        : "You Win!"
      : state.winner === 2
        ? mode === "local"
          ? "White Wins!"
          : "CPU Wins!"
        : state.winner === "draw"
          ? "Draw!"
          : humanTurn
            ? mode === "local"
              ? `Player ${state.current} — place stone`
              : "돌을 놓으세요 (5목)"
            : "CPU...";

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
          <p className="text-sm text-muted-foreground self-center">{msg}</p>
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
        className="relative grid w-full max-w-md gap-px rounded bg-amber-900/40 p-1"
        style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}
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
                  primeGameAudio();
                  playGameFeel("button");
                  feelTap();
                  dispatch({ type: "place", row: ri, col: ci });
                }}
                className={cn(
                  "aspect-square min-h-5 min-w-5 rounded-sm bg-amber-100/20 transition-transform duration-150 active:scale-95 sm:min-h-6 sm:min-w-6",
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
          score={mode === "cpu" ? computeScore(state) : undefined}
          gameSlug={GAME_SLUG}
          isNewBest={feel.isNewBest}
          bestRecordDelta={feel.bestRecordDelta}
          onExit={handleExit}
          onRetry={handleRetry}
          onRestart={handleRetry}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Gomoku" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">
        {mode === "local"
          ? "같은 기기 2인 — 가로·세로·대각 5목."
          : "Five in a row to win."}
      </p>
    </div>
  );
}
