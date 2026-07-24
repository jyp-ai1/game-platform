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
import { Button, GameOverOverlay, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useEffect, useReducer } from "react";

import {
  createInitialState,
  nextRound,
  slide,
  tickPower,
  type ShuffleboardState,
} from "./engine";

const GAME_SLUG = "shuffleboard";
const TICK_MS = 32;

type Action =
  | { type: "tick" }
  | { type: "slide" }
  | { type: "next" }
  | { type: "restart" };

function reducer(state: ShuffleboardState, action: Action): ShuffleboardState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "tick":
      return tickPower(state);
    case "slide":
      return slide(state);
    case "next":
      return nextRound(state);
    default:
      return state;
  }
}

export function ShuffleboardGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "over" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status !== "aiming") return;
    const id = setInterval(() => dispatch({ type: "tick" }), TICK_MS);
    return () => clearInterval(id);
  }, [state.status]);

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, reportScore]);

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm justify-between">
        <ScoreBox label="Score" value={state.score} />
        <ScoreBox label="Round" value={state.round} />
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => dispatch({ type: "restart" })}>
          <RotateCcw />
        </Button>
      </div>
      <div className="relative h-20 w-full max-w-sm overflow-hidden rounded-xl border border-border">
        <div className="absolute inset-y-0 left-[30%] w-0.5 bg-muted-foreground/30" />
        <div className="absolute inset-y-0 left-[52%] w-0.5 bg-muted-foreground/30" />
        <div className="absolute inset-y-0 left-[72%] w-0.5 bg-muted-foreground/30" />
        <div className="absolute inset-y-0 left-[88%] w-0.5 bg-amber-400/60" />
        <div
          className="absolute top-1/2 size-10 -translate-y-1/2 rounded-full bg-sky-500 shadow-md transition-all duration-500"
          style={{ left: `${state.discX}%` }}
        />
      </div>
      <div className="flex w-full max-w-sm justify-between text-xs text-muted-foreground">
        <span>0</span><span>1pt</span><span>2pt</span><span>3pt</span><span>4pt</span>
      </div>
      <div className="h-4 w-full max-w-sm overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${state.power}%` }} />
      </div>
      {state.status === "aiming" ? (
        <Button disabled={!canPlayRef.current} onClick={() => dispatch({ type: "slide" })}>
          Slide!
        </Button>
      ) : null}
      {state.status === "result" ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm">Zone score: +{state.lastPoints}</p>
          <Button onClick={() => dispatch({ type: "next" })}>Next round</Button>
        </div>
      ) : null}
      {state.status === "over" ? (
        <GameOverOverlay
          message={`Total ${state.score} points`}
          score={state.score}
          gameSlug={GAME_SLUG}
          onRetry={() => emitGameRetry(GAME_SLUG)}
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={completeCountdown} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Shuffleboard" onResume={onResume} onNewGame={onNewGame} />
      ) : null}
    </div>
  );
}
