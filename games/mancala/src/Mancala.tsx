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
import { useEffect, useReducer, useState } from "react";

import {
  computeScore,
  cpuMove,
  createInitialState,
  playerMove,
  type MancalaState,
} from "./engine";

const GAME_SLUG = "mancala";

type Action =
  | { type: "pick"; pit: number }
  | { type: "cpu"; difficulty: CpuDifficulty }
  | { type: "restart" };

function reducer(state: MancalaState, action: Action): MancalaState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "cpu":
      return cpuMove(state, action.difficulty);
    case "pick":
      return playerMove(state, action.pit);
    default:
      return state;
  }
}

export function MancalaGame() {
  const { phase, initialState, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
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
    if (state.winner !== null || state.current !== 2) return;
    const id = setTimeout(() => dispatch({ type: "cpu", difficulty }), 550);
    return () => clearTimeout(id);
  }, [state.current, state.winner, state.pits, difficulty]);

  useEffect(() => {
    if (state.winner !== null) {
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
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

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="You" value={state.pits[6]!} />
        <ScoreBox label="CPU" value={state.pits[13]!} />
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={() => dispatch({ type: "restart" })}
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
                playGameFeel("button");
                feelTap();
                dispatch({ type: "pick", pit });
              }}
              className={cn(
                "flex aspect-[2/1] flex-col items-center justify-center rounded-lg bg-primary/20 text-sm",
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
          onExit={feel.handleExit}
          onRetry={() => emitGameRetry(GAME_SLUG)}
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Mancala" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
    </div>
  );
}
