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
  PIECE_SYMBOL,
  PROMOTION_PIECES,
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

type GameMode = "cpu" | "local";

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

function statusMessage(state: Chess960State, mode: GameMode): string {
  if (state.winner === "w") return mode === "local" ? "White Wins!" : "You Win!";
  if (state.winner === "b") return mode === "local" ? "Black Wins!" : "CPU Wins!";
  if (state.winner === "draw") return "Draw";
  if (mode === "local") return `${state.current === "w" ? "White" : "Black"} to move`;
  return state.current === "w" ? "Chess960 — your move" : "CPU...";
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
  const [mode, setMode] = useState<GameMode>("cpu");
  const [matchRound, setMatchRound] = useState(1);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [pendingPromo, setPendingPromo] = useState<Move[] | null>(null);
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
    if (mode !== "cpu" || !canPlayRef.current || state.winner !== null || state.current !== "b") return;
    const id = setTimeout(() => dispatch({ type: "cpu", difficulty }), 600);
    return () => clearTimeout(id);
  }, [mode, state.current, state.winner, state.board, difficulty, canPlay]);

  useEffect(() => {
    if (state.winner !== null && prevStatusRef.current === null) {
      if (mode === "cpu" && state.winner === "w") {
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
      setPendingPromo(null);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.winner, reportScore, mode]);

  const activeColor = mode === "local" ? state.current : "w";
  const humanTurn =
    canPlayRef.current && state.winner === null && (mode === "local" || state.current === "w");
  const legal = humanTurn || pendingPromo ? getLegalMoves(state, activeColor) : [];

  function commitMove(move: Move) {
    dispatch({ type: "move", move });
    setSelected(null);
    setPendingPromo(null);
  }

  function onCell(r: number, c: number) {
    if (pendingPromo) return;
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

    if (move?.promotion) {
      const promos = legal.filter(
        (m) =>
          m.from[0] === move.from[0] &&
          m.from[1] === move.from[1] &&
          m.to[0] === move.to[0] &&
          m.to[1] === move.to[1] &&
          m.promotion
      );
      if (promos.length > 1) {
        setPendingPromo(promos);
        return;
      }
    }

    if (move) {
      commitMove(move);
      return;
    }

    const piece = state.board[r]![c];
    if (piece && piece[0] === activeColor && legal.some((m) => m.from[0] === r && m.from[1] === c)) {
      setSelected([r, c]);
    } else {
      setSelected(null);
    }
  }

  const msg = statusMessage(state, mode);
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
    if (state.winner !== null) setMatchRound((r) => r + 1);
    setSelected(null);
    setPendingPromo(null);
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    resetGameAudioPrime();
    if (state.winner !== null) setMatchRound((r) => r + 1);
    setSelected(null);
    setPendingPromo(null);
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
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
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
      {pendingPromo ? (
        <div className="flex flex-wrap justify-center gap-2">
          <span className="text-sm text-muted-foreground">Promote to:</span>
          {PROMOTION_PIECES.map((pt) => (
            <Button
              key={pt}
              size="sm"
              onClick={() => {
                const move = pendingPromo.find((m) => m.promotion === pt);
                if (move) commitMove(move);
              }}
            >
              {PIECE_SYMBOL[`${activeColor}${pt}` as keyof typeof PIECE_SYMBOL]}
            </Button>
          ))}
        </div>
      ) : null}
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
                disabled={!humanTurn || !!pendingPromo}
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
        <ResumeDialog gameTitle="Chess960" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
      <p className="text-xs text-muted-foreground">
        {mode === "local"
          ? "Fischer Random — 같은 기기 2인 대국."
          : "Random back rank · castling · en passant · promotion."}
      </p>
    </div>
  );
}
