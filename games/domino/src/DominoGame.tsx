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
import { Button, cn, GameOverOverlay, ReadyCountdown } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useEffect, useReducer } from "react";

import {
  computeScore,
  cpuMove,
  createInitialState,
  getPlayableIndices,
  playerDraw,
  playerPlay,
  type DominoState,
} from "./engine";

const GAME_SLUG = "domino";
const CPU_DELAY = 500;

type Action =
  | { type: "play"; index: number }
  | { type: "draw" }
  | { type: "cpu" }
  | { type: "restart" };

function reducer(state: DominoState, action: Action): DominoState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "play":
      return playerPlay(state, action.index);
    case "draw":
      return playerDraw(state);
    case "cpu":
      return cpuMove(state);
    default:
      return state;
  }
}

export function DominoGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const playable = getPlayableIndices(state);
  const humanTurn =
    canPlayRef.current && state.current === "player" && !state.winner;

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.winner ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.winner || state.current !== "cpu") return;
    const id = setTimeout(() => dispatch({ type: "cpu" }), CPU_DELAY);
    return () => clearTimeout(id);
  }, [state.current, state.winner, state.chain.length]);

  useEffect(() => {
    if (state.winner) {
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
    }
  }, [state.winner, reportScore]);

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <div className="flex min-h-12 w-full max-w-sm flex-wrap justify-center gap-1 rounded-lg bg-muted/40 p-2">
        {state.chain.length === 0 ? (
          <span className="text-xs text-muted-foreground">Chain empty</span>
        ) : (
          state.chain.map((t, i) => (
            <span key={i} className="rounded bg-background px-2 py-1 text-sm font-mono">
              {t[0]}|{t[1]}
            </span>
          ))
        )}
      </div>
      <div className="flex w-full max-w-sm flex-wrap justify-center gap-2">
        {state.playerHand.map((t, i) => {
          const canPlay = humanTurn && playable.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={!canPlay}
              onClick={() => dispatch({ type: "play", index: i })}
              className={cn(
                "rounded-lg border-2 px-3 py-2 font-mono text-sm",
                canPlay ? "border-primary bg-primary/10 hover:bg-primary/20" : "opacity-50"
              )}
            >
              {t[0]}|{t[1]}
            </button>
          );
        })}
      </div>
      {humanTurn && playable.length === 0 && state.boneyard.length > 0 ? (
        <Button onClick={() => dispatch({ type: "draw" })}>Draw tile</Button>
      ) : null}
      {state.winner ? (
        <GameOverOverlay
          message={state.message}
          score={computeScore(state)}
          gameSlug={GAME_SLUG}
          onRetry={() => emitGameRetry(GAME_SLUG)}
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Domino" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
    </div>
  );
}
