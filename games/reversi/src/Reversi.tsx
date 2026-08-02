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
  computeScore,
  cpuMove,
  createInitialState,
  discCounts,
  placeDisc,
  resolvePass,
  validMoves,
  type ReversiState,
} from "./engine";
import {
  playGameOverAudio,
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "reversi";

type Action =
  | { type: "place"; row: number; col: number }
  | { type: "cpu"; difficulty: CpuDifficulty }
  | { type: "pass" }
  | { type: "restart" };

function reducer(state: ReversiState, action: Action): ReversiState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "place":
      return placeDisc(state, action.row, action.col);
    case "pass":
      return resolvePass(state);
    case "cpu":
      return cpuMove(state, action.difficulty);
    default:
      return state;
  }
}

export function ReversiGame() {
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
  const prevStatusRef = useRef(state.winner);
  const { reportScore } = useGameSDK();
  const { fieldRef, feel, feelTap, FeelLayer } = useHumanVsCpuFeel(GAME_SLUG, {
    winner: state.winner,
    humanSide: 1,
    cpuSide: 2,
    difficulty,
    score: computeScore(state),
  });
  const humanMoves = validMoves(state.board, 1);
  const humanTurn =
    canPlayRef.current && state.current === 1 && state.winner === null;

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.winner !== null ? null : state),
    [state]
  );

  useEffect(() => {
    if (!canPlayRef.current || state.winner !== null || state.current !== 2) return;
    const id = setTimeout(() => dispatch({ type: "cpu", difficulty }), 500);
    return () => clearTimeout(id);
  }, [state.current, state.winner, state.board, difficulty, canPlay]);

  const canPass =
    humanTurn && humanMoves.length === 0 && state.winner === null;

  useEffect(() => {
    if (state.winner !== null && prevStatusRef.current === null) {
      if (state.winner === 1) {
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
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.winner, reportScore]);

  const msg =
    state.winner === 1
      ? "You Win!"
      : state.winner === 2
        ? "CPU Wins!"
        : state.winner === "draw"
          ? "Draw"
          : canPass
            ? "둘 곳 없음 — Pass 가능"
            : humanTurn
              ? "흑(당신) 차례"
              : "CPU 차례...";

  const discs = discCounts(state);

  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    resetGameAudioPrime();
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    resetGameAudioPrime();
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between gap-2">
        <div className="flex gap-2">
          <ScoreBox label="Black" value={discs.black} />
          <ScoreBox label="White" value={discs.white} />
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
      <div className="flex w-full max-w-sm items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{msg}</p>
        {canPass ? (
          <Button
            size="sm"
            onClick={() => {
              primeGameAudio();
              playGameFeel("button");
              dispatch({ type: "pass" });
            }}
          >
            Pass
          </Button>
        ) : null}
      </div>
      <CpuDifficultyPicker
        value={difficulty}
        onChange={setDifficulty}
        disabled={state.winner !== null}
      />
      <div
        ref={fieldRef}
        className="relative grid w-full max-w-sm grid-cols-8 gap-0.5 rounded-xl bg-green-800/40 p-1"
      >
        {state.board.map((row, ri) =>
          row.map((cell, ci) => {
            const valid = humanTurn && humanMoves.some(([r, c]) => r === ri && c === ci);
            return (
              <button
                key={`${ri}-${ci}`}
                type="button"
                disabled={!valid}
                onClick={() => {
                  primeGameAudio();
                  playGameFeel("button");
                  feelTap();
                  dispatch({ type: "place", row: ri, col: ci });
                }}
                className={cn(
                  "aspect-square min-h-11 min-w-11 rounded-sm bg-green-700/50 transition-transform duration-150 active:scale-95",
                  valid && "ring-1 ring-primary",
                  cell === 1 && "bg-neutral-900",
                  cell === 2 && "bg-neutral-100"
                )}
                aria-label={`칸 ${ri + 1}-${ci + 1}`}
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
          onExit={handleExit}
          onRetry={handleRetry}
          onRestart={handleRetry}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Reversi" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
    </div>
  );
}
