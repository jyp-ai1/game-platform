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
  applyMove,
  computeScore,
  cpuMove,
  createInitialState,
  getLegalMoves,
  PIECE_SYMBOL,
  type Chess960State,
  type Move,
} from "./engine";
import {
  playGameOverAudio,
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "chess960";

type Action =
  | { type: "move"; move: Move }
  | { type: "cpu"; difficulty: CpuDifficulty }
  | { type: "restart" };

function reducer(state: Chess960State, action: Action): Chess960State {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "cpu":
      return cpuMove(state, action.difficulty);
    case "move":
      return applyMove(state, action.move);
    default:
      return state;
  }
}

export function Chess960Game() {
  const { phase, initialState, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

  const [state, dispatch] = useReducer(reducer, initialState);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [difficulty, setDifficulty] = useState<CpuDifficulty>("normal");
  const prevStatusRef = useRef(state.winner);
  const { reportScore } = useGameSDK();
  const { fieldRef, feel, feelTap, FeelLayer } = useHumanVsCpuFeel(GAME_SLUG, {
    winner: state.winner,
    humanSide: "w",
    cpuSide: "b",
    difficulty,
    score: computeScore(state),
  });

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.winner !== null ? null : state),
    [state]
  );

  useEffect(() => {
    if (!canPlayRef.current || state.winner !== null || state.current !== "b") return;
    const id = setTimeout(() => dispatch({ type: "cpu", difficulty }), 600);
    return () => clearTimeout(id);
  }, [state.current, state.winner, state.board, difficulty, canPlay]);

  useEffect(() => {
    if (state.winner !== null && prevStatusRef.current === null) {
      if (state.winner === "w") {
        playStageClearAudio();
      } else {
        playGameOverAudio();
      }
    }
    prevStatusRef.current = state.winner;
  }, [state.winner]);

  useEffect(() => {
    if (state.winner !== null) {
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
      setSelected(null);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.winner, reportScore]);

  const humanTurn =
    canPlayRef.current && state.current === "w" && state.winner === null;
  const legal = humanTurn ? getLegalMoves(state, "w") : [];

  function onCell(r: number, c: number) {
    if (!humanTurn) return;
    primeGameAudio();
    playGameFeel("button");
    feelTap();
    const move = selected
      ? legal.find(
          (m) =>
            m.from[0] === selected[0] &&
            m.from[1] === selected[1] &&
            m.to[0] === r &&
            m.to[1] === c
        )
      : null;
    if (move) {
      dispatch({ type: "move", move });
      setSelected(null);
      return;
    }
    const piece = state.board[r]![c];
    if (piece && piece[0] === "w" && legal.some((m) => m.from[0] === r && m.from[1] === c)) {
      setSelected([r, c]);
    } else {
      setSelected(null);
    }
  }

  const msg =
    state.winner === "w"
      ? "You Win!"
      : state.winner === "b"
        ? "CPU Wins!"
        : state.winner === "draw"
          ? "Draw"
          : humanTurn
            ? "Chess960 — your move"
            : "CPU...";

  const targets = selected
    ? legal.filter((m) => m.from[0] === selected[0] && m.from[1] === selected[1]).map((m) => m.to)
    : [];


  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    resetGameAudioPrime();
    setSelected(null);
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    resetGameAudioPrime();
    setSelected(null);
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{msg}</p>
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
        className="relative grid w-full max-w-sm grid-cols-8 gap-0.5 rounded-xl border border-border p-1"
      >
        {state.board.map((row, r) =>
          row.map((cell, c) => {
            const light = (r + c) % 2 === 0;
            const isSel = selected?.[0] === r && selected?.[1] === c;
            const isTarget = targets.some(([tr, tc]) => tr === r && tc === c);
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                disabled={!humanTurn}
                onClick={() => onCell(r, c)}
                className={cn(
                  "flex aspect-square min-h-11 min-w-11 items-center justify-center text-2xl transition-transform duration-150 active:scale-95",
                  light ? "bg-muted/50" : "bg-amber-900/30",
                  isSel && "ring-2 ring-primary",
                  isTarget && "ring-2 ring-green-400"
                )}
              >
                {cell ? PIECE_SYMBOL[cell] : null}
              </button>
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
          onExit={handleExit}
          onRetry={handleRetry}
          onRestart={handleRetry}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Chess960" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
    </div>
  );
}
