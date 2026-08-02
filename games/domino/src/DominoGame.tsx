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
  getPlayableIndices,
  getSecondPlayerPlayableIndices,
  playerDraw,
  playerPlay,
  resolvePlayerTurn,
  resolveSecondPlayerTurn,
  secondPlayerPlay,
  type DominoState,
} from "./engine";
import {
  playGameOverAudio,
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "domino";
const CPU_DELAY = 500;

type GameMode = "cpu" | "local";

type Action =
  | { type: "play"; index: number; seat: "p1" | "p2" }
  | { type: "draw" }
  | { type: "resolve"; seat: "p1" | "p2" }
  | { type: "cpu"; difficulty: CpuDifficulty }
  | { type: "restart" };

function reducer(state: DominoState, action: Action): DominoState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "play":
      return action.seat === "p1"
        ? playerPlay(state, action.index)
        : secondPlayerPlay(state, action.index);
    case "draw":
      return playerDraw(state);
    case "resolve":
      return action.seat === "p1" ? resolvePlayerTurn(state) : resolveSecondPlayerTurn(state);
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
  const [mode, setMode] = useState<GameMode>("cpu");
  const [matchRound, setMatchRound] = useState(1);
  const [difficulty, setDifficulty] = useState<CpuDifficulty>("normal");
  const prevStatusRef = useRef(state.winner);
  const { reportScore } = useGameSDK();
  const { fieldRef, feel, feelTap, FeelLayer } = useHumanVsCpuFeel(GAME_SLUG, {
    winner: state.winner,
    humanSide: "player",
    cpuSide: "cpu",
    difficulty,
    score: computeScore(state),
  });
  const playable =
    state.current === "player"
      ? getPlayableIndices(state)
      : getSecondPlayerPlayableIndices(state);
  const activeHand =
    state.current === "player" ? state.playerHand : state.cpuHand;
  const humanTurn =
    canPlayRef.current &&
    !state.winner &&
    (mode === "local" || state.current === "player");

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.winner ? null : state),
    [state]
  );

  useEffect(() => {
    if (mode !== "cpu" || !canPlayRef.current || state.winner || state.current !== "cpu") return;
    const id = setTimeout(() => dispatch({ type: "cpu", difficulty }), CPU_DELAY);
    return () => clearTimeout(id);
  }, [mode, state.current, state.winner, state.chain.length, difficulty, canPlay]);

  useEffect(() => {
    if (!canPlayRef.current || state.winner) return;
    if (state.current === "player") {
      dispatch({ type: "resolve", seat: "p1" });
    } else if (mode === "local") {
      dispatch({ type: "resolve", seat: "p2" });
    }
  }, [state.current, state.winner, state.playerHand, state.cpuHand, state.boneyard.length, state.chain.length, canPlay, mode]);

  useEffect(() => {
    if (state.winner && prevStatusRef.current === null) {
      if (mode === "cpu" && state.winner === "player") {
        playStageClearAudio();
      } else if (mode === "cpu") {
        playGameOverAudio();
      }
    }
    prevStatusRef.current = state.winner;
  }, [state.winner, mode]);

  useEffect(() => {
    if (state.winner && mode === "cpu") {
      reportScore(GAME_SLUG, computeScore(state));
    }
    if (state.winner) {
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.winner, reportScore, mode]);

  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    resetGameAudioPrime();
    if (state.winner) setMatchRound((r) => r + 1);
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    resetGameAudioPrime();
    if (state.winner) setMatchRound((r) => r + 1);
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ScoreBox label="Round" value={matchRound} />
          <ScoreBox label={mode === "local" ? "P1" : "Hand"} value={state.playerHand.length} />
          {mode === "local" ? (
            <ScoreBox label="P2" value={state.cpuHand.length} />
          ) : null}
          <p className="text-sm text-muted-foreground">
            {state.winner
              ? state.message
              : mode === "local"
                ? state.current === "player"
                  ? "Player 1 turn"
                  : "Player 2 turn"
                : state.message}
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
          disabled={!!state.winner}
          onClick={() => setMode("cpu")}
        >
          vs CPU
        </Button>
        <Button
          variant={mode === "local" ? "default" : "outline"}
          size="sm"
          disabled={!!state.winner}
          onClick={() => setMode("local")}
        >
          2 Player
        </Button>
      </div>
      {mode === "cpu" ? (
        <CpuDifficultyPicker
          value={difficulty}
          onChange={setDifficulty}
          disabled={!!state.winner}
        />
      ) : null}
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
          {activeHand.map((t, i) => {
            const canPlayTile =
              humanTurn &&
              (mode === "local" || state.current === "player") &&
              playable.includes(i);
            return (
              <button
                key={i}
                type="button"
                disabled={!canPlayTile}
                onClick={() => {
                  primeGameAudio();
                  playGameFeel("button");
                  feelTap();
                  dispatch({
                    type: "play",
                    index: i,
                    seat: state.current === "player" ? "p1" : "p2",
                  });
                }}
                className={cn(
                  "min-h-11 rounded-lg border-2 px-3 py-3 font-mono text-sm transition-transform duration-150 active:scale-95",
                  canPlayTile ? "border-primary bg-primary/10 hover:bg-primary/20" : "opacity-50"
                )}
              >
                {t[0]}|{t[1]}
              </button>
            );
          })}
        </div>
        {humanTurn && state.current === "player" && playable.length === 0 && state.boneyard.length > 0 ? (
          <Button
            onClick={() => {
              primeGameAudio();
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
        <ResumeDialog gameTitle="Domino" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">
        {mode === "local"
          ? "같은 기기 2인 — 체인 끝에 맞추거나 Draw."
          : "Match chain ends · draw when stuck · empty hand wins."}
      </p>
    </div>
  );
}
