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
  playerMove,
  resolveTurn,
  type MancalaState,
} from "./engine";
import {
  playGameOverAudio,
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "mancala";

type Action =
  | { type: "pick"; pit: number }
  | { type: "cpu"; difficulty: CpuDifficulty }
  | { type: "resolve" }
  | { type: "restart" };

function reducer(state: MancalaState, action: Action): MancalaState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "cpu":
      return cpuMove(state, action.difficulty);
    case "pick":
      return playerMove(state, action.pit);
    case "resolve":
      return resolveTurn(state);
    default:
      return state;
  }
}

export function MancalaGame() {
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

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.winner !== null ? null : state),
    [state]
  );

  useEffect(() => {
    if (!canPlayRef.current || state.winner !== null || state.current !== 2) return;
    const id = setTimeout(() => dispatch({ type: "cpu", difficulty }), 550);
    return () => clearTimeout(id);
  }, [state.current, state.winner, state.pits, difficulty, canPlay]);

  useEffect(() => {
    if (!canPlayRef.current || state.winner !== null) return;
    dispatch({ type: "resolve" });
  }, [state.current, state.winner, state.pits, canPlay]);

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
  }, [state.winner, reportScore, state.pits]);

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
            ? "Pick a pit"
            : "CPU...";

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
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="You" value={state.pits[6]!} />
        <ScoreBox label="CPU" value={state.pits[13]!} />
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={handleRetry}
        >
          <RotateCcw />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{msg}</p>
      <CpuDifficultyPicker
        value={difficulty}
        onChange={setDifficulty}
        disabled={state.winner !== null}
      />
      <div
        ref={fieldRef}
        className="relative flex w-full max-w-sm flex-col gap-3 rounded-xl border border-border p-3"
      >
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 6 }, (_, i) => 12 - i).map((pit) => (
            <button
              key={pit}
              type="button"
              disabled
              className="flex aspect-[2/1] flex-col items-center justify-center rounded-lg bg-muted/50 text-sm"
            >
              <span className="text-xs text-muted-foreground">CPU</span>
              <span className="font-bold">{state.pits[pit]}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 6 }, (_, pit) => (
            <button
              key={pit}
              type="button"
              disabled={!humanTurn || state.pits[pit] === 0}
              onClick={() => {
                primeGameAudio();
                playGameFeel("button");
                feelTap();
                dispatch({ type: "pick", pit });
              }}
              className={cn(
                "flex min-h-11 aspect-[2/1] flex-col items-center justify-center rounded-lg bg-primary/20 py-3 text-sm transition-transform duration-150 active:scale-95",
                humanTurn && state.pits[pit]! > 0 && "hover:bg-primary/40"
              )}
            >
              <span className="font-bold">{state.pits[pit]}</span>
            </button>
          ))}
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
          onExit={handleExit}
          onRetry={handleRetry}
          onRestart={handleRetry}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Mancala" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
    </div>
  );
}
