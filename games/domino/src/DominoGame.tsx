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
  computeScore,
  cpuMove,
  createInitialState,
  getPlayableIndices,
  playerDraw,
  playerPlay,
  resolvePlayerTurn,
  type DominoState,
} from "./engine";

const GAME_SLUG = "domino";
const CPU_DELAY = 500;

type Action =
  | { type: "play"; index: number }
  | { type: "draw" }
  | { type: "resolve" }
  | { type: "cpu"; difficulty: CpuDifficulty }
  | { type: "restart" };

function reducer(state: DominoState, action: Action): DominoState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "play":
      return playerPlay(state, action.index);
    case "draw":
      return playerDraw(state);
    case "resolve":
      return resolvePlayerTurn(state);
    case "cpu":
      return cpuMove(state, action.difficulty);
    default:
      return state;
  }
}

export function DominoGame() {
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
  const { reportScore } = useGameSDK();
  const { fieldRef, feel, feelTap, FeelLayer } = useHumanVsCpuFeel(GAME_SLUG, {
    winner: state.winner,
    humanSide: "player",
    cpuSide: "cpu",
    difficulty,
    score: computeScore(state),
  });
  const playable = getPlayableIndices(state);
  const humanTurn =
    canPlayRef.current && state.current === "player" && !state.winner;

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.winner ? null : state),
    [state]
  );

  useEffect(() => {
    if (!canPlayRef.current || state.winner || state.current !== "cpu") return;
    const id = setTimeout(() => dispatch({ type: "cpu", difficulty }), CPU_DELAY);
    return () => clearTimeout(id);
  }, [state.current, state.winner, state.chain.length, difficulty, canPlay]);

  useEffect(() => {
    if (!canPlayRef.current || state.winner || state.current !== "player") return;
    dispatch({ type: "resolve" });
  }, [state.current, state.winner, state.playerHand, state.boneyard.length, state.chain.length, canPlay]);

  useEffect(() => {
    if (state.winner) {
      reportScore(GAME_SLUG, computeScore(state));
      clearSave(GAME_SLUG);
    }
  }, [state.winner, reportScore]);


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
        <p className="text-sm text-muted-foreground">{state.message}</p>
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
        disabled={!!state.winner}
      />
      <div ref={fieldRef} className="relative flex w-full max-w-sm flex-col gap-3">
        <div className="flex min-h-12 flex-wrap justify-center gap-1 rounded-lg bg-muted/40 p-2">
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
        <div className="flex flex-wrap justify-center gap-2">
          {state.playerHand.map((t, i) => {
            const canPlay = humanTurn && playable.includes(i);
            return (
              <button
                key={i}
                type="button"
                disabled={!canPlay}
                onClick={() => {
                  playGameFeel("button");
                  feelTap();
                  dispatch({ type: "play", index: i });
                }}
                className={cn(
                  "min-h-11 rounded-lg border-2 px-3 py-3 font-mono text-sm transition-transform duration-150 active:scale-95",
                  canPlay ? "border-primary bg-primary/10 hover:bg-primary/20" : "opacity-50"
                )}
              >
                {t[0]}|{t[1]}
              </button>
            );
          })}
        </div>
        {humanTurn && playable.length === 0 && state.boneyard.length > 0 ? (
          <Button
            onClick={() => {
              playGameFeel("button");
              feelTap();
              dispatch({ type: "draw" });
            }}
          >
            Draw tile
          </Button>
        ) : null}
        <FeelLayer />
      </div>
      {state.winner ? (
        <StandardGameOverOverlay
          message={state.message}
          score={computeScore(state)}
          gameSlug={GAME_SLUG}
          isNewBest={feel.isNewBest}
          bestRecordDelta={feel.bestRecordDelta}
          onExit={feel.handleExit}
          onRetry={handleRetry}
          onRestart={handleRetry}
        />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Domino" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
    </div>
  );
}
