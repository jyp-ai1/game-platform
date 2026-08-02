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
  applyMove,
  computeScore,
  cpuMove,
  createInitialState,
  getLegalMoves,
  type CheckersState,
} from "./engine";
import {
  playGameOverAudio,
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "checkers";

type GameMode = "cpu" | "local";

type Action =
  | { type: "move"; move: ReturnType<typeof getLegalMoves>[number] }
  | { type: "cpu"; difficulty: CpuDifficulty }
  | { type: "restart" };

function reducer(state: CheckersState, action: Action): CheckersState {
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

export function CheckersGame() {
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
  const [selected, setSelected] = useState<[number, number] | null>(null);
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
    if (mode !== "cpu" || !canPlayRef.current || state.winner !== null || state.current !== 2) return;
    const id = setTimeout(() => dispatch({ type: "cpu", difficulty }), 500);
    return () => clearTimeout(id);
  }, [mode, state.current, state.winner, state.board, state.mustContinue, difficulty, canPlay]);

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
      setSelected(null);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.winner, reportScore, mode]);

  const activePlayer = mode === "local" ? state.current : 1;
  const humanTurn =
    canPlayRef.current && state.winner === null && (mode === "local" || state.current === 1);
  const legal = humanTurn ? getLegalMoves(state, activePlayer) : [];

  function onCell(r: number, c: number) {
    if (!humanTurn) return;
    primeGameAudio();
    playGameFeel("button");
    feelTap();
    if (state.mustContinue) {
      const jump = legal.find((m) => m.to[0] === r && m.to[1] === c);
      if (jump) {
        dispatch({ type: "move", move: jump });
        setSelected(null);
      }
      return;
    }
    const moveHere = selected
      ? legal.find(
          (m) =>
            m.from[0] === selected[0] &&
            m.from[1] === selected[1] &&
            m.to[0] === r &&
            m.to[1] === c
        )
      : null;
    if (moveHere) {
      dispatch({ type: "move", move: moveHere });
      setSelected(null);
      return;
    }
    if (legal.some((m) => m.from[0] === r && m.from[1] === c)) setSelected([r, c]);
    else setSelected(null);
  }

  const msg =
    state.winner === 1
      ? mode === "local"
        ? "Player 1 Wins!"
        : "You Win!"
      : state.winner === 2
        ? mode === "local"
          ? "Player 2 Wins!"
          : "CPU Wins!"
        : state.winner === "draw"
          ? "Draw"
          : humanTurn
            ? state.mustContinue
              ? "Continue jumping!"
              : mode === "local"
                ? `Player ${state.current} — select a piece`
                : "Select a piece"
            : "CPU...";

  const targets = selected
    ? legal
        .filter((m) => m.from[0] === selected[0] && m.from[1] === selected[1])
        .map((m) => m.to)
    : [];


  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    resetGameAudioPrime();
    if (state.winner !== null) setMatchRound((r) => r + 1);
    setSelected(null);
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    resetGameAudioPrime();
    if (state.winner !== null) setMatchRound((r) => r + 1);
    setSelected(null);
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="Round" value={matchRound} />
          <p className="text-sm font-medium text-muted-foreground self-center">{msg}</p>
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
        className="relative grid w-full max-w-sm grid-cols-8 gap-0.5 rounded-xl border border-border p-1"
      >
        {state.board.map((row, r) =>
          row.map((cell, c) => {
            const dark = (r + c) % 2 === 1;
            const isSel = selected?.[0] === r && selected?.[1] === c;
            const isTarget = targets.some(([tr, tc]) => tr === r && tc === c);
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                disabled={!dark || !humanTurn}
                onClick={() => onCell(r, c)}
                className={cn(
                  "aspect-square min-h-11 min-w-11 rounded-sm transition-transform duration-150 active:scale-95",
                  dark ? "bg-amber-900/40" : "bg-muted/30",
                  isSel && "ring-2 ring-primary",
                  isTarget && "ring-2 ring-green-400"
                )}
              >
                {cell === 1 || cell === 2 ? (
                  <span
                    className={cn(
                      "mx-auto block size-[70%] rounded-full bg-primary",
                      cell === 2 && "ring-2 ring-amber-300"
                    )}
                  />
                ) : cell === 3 || cell === 4 ? (
                  <span
                    className={cn(
                      "mx-auto block size-[70%] rounded-full bg-destructive",
                      cell === 4 && "ring-2 ring-amber-300"
                    )}
                  />
                ) : null}
              </button>
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
        <ResumeDialog gameTitle="Checkers" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">
        {mode === "local"
          ? "같은 기기 2인 — 점프 가능하면 반드시 점프해야 합니다."
          : "Forced capture · multi-jump · kinging enabled."}
      </p>
    </div>
  );
}
