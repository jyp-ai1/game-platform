"use client";

import {
  clearSave,
  ResumeDialog,
  SaveIndicator,
  useAutoSave,
  useGameSDK,
  emitGameRetry,
  useReadyCountdown,
  useResumableGame,
} from "@game-platform/game-sdk";
import { Button, cn, GameOverOverlay, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useEffect, useReducer } from "react";

import {
  computeScore,
  cpuMove,
  createInitialState,
  playerMove,
  type MancalaState,
} from "./engine";

const GAME_SLUG = "mancala";

type Action = { type: "pick"; pit: number } | { type: "cpu" } | { type: "restart" };

function reducer(state: MancalaState, action: Action): MancalaState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "cpu":
      return cpuMove(state);
    case "pick":
      return playerMove(state, action.pit);
    default:
      return state;
  }
}

export function MancalaGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlay, canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.winner !== null ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.winner !== null || state.current !== 2) return;
    const id = setTimeout(() => dispatch({ type: "cpu" }), 550);
    return () => clearTimeout(id);
  }, [state.current, state.winner, state.pits]);

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
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="You" value={state.pits[6]!} />
        <ScoreBox label="CPU" value={state.pits[13]!} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{msg}</p>
      <div className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-border p-3">
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
              onClick={() => dispatch({ type: "pick", pit })}
              className={cn(
                "flex aspect-[2/1] flex-col items-center justify-center rounded-lg bg-primary/20 text-sm",
                humanTurn && state.pits[pit]! > 0 && "hover:bg-primary/40"
              )}
            >
              <span className="font-bold">{state.pits[pit]}</span>
            </button>
          ))}
        </div>
      </div>
      {state.winner !== null ? (
        <GameOverOverlay
          message={msg}
          score={computeScore(state)}
          gameSlug={GAME_SLUG}
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
