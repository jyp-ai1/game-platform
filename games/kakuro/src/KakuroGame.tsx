"use client";

import {
  clearSave,
  emitGameRetry,
  PuzzlePlayField,
  playGameFeel,
  ResumeDialog,
  SaveIndicator,
  StandardGameOverOverlay,
  useAutoSave,
  useGameSDK,
  useGameSession,
  useReadyCountdown,
  useResumableGame,
  standardFeelFromState,
  useStandardGameFeel,
} from "@game-platform/game-sdk";
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  clearCell,
  clearWrongFlash,
  computeScore,
  createInitialState,
  enterDigit,
  selectCell,
  SIZE,
  type ClueCell,
  type KakuroState,
} from "./engine";
import {
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "kakuro";
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const PUZZLE_FIELD_CLASS = "touch-none max-w-[min(100%,20.5rem)]";

type Action =
  | { type: "select"; row: number; col: number }
  | { type: "digit"; n: number }
  | { type: "clear" }
  | { type: "clearFlash" }
  | { type: "restart" };

function reducer(state: KakuroState, action: Action): KakuroState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "select":
      return selectCell(state, action.row, action.col);
    case "digit":
      return enterDigit(state, action.n);
    case "clear":
      return clearCell(state);
    case "clearFlash":
      return clearWrongFlash(state);
    default:
      return state;
  }
}

export function KakuroGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

  const sessionActive = phase === "ready" && !showCountdown;
  const { recordGameEnd, resetSession } = useGameSession(GAME_SLUG, sessionActive);

  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const prevStatusRef = useRef(state.status);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    score: computeScore(state),
    fieldRef,
  });

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "won" ? null : state),
    [state]
  );

  useEffect(() => {
    if (!state.wrongFlash) return;
    playGameFeel("wrong", fieldRef.current);
    const id = window.setTimeout(() => dispatch({ type: "clearFlash" }), 400);
    return () => window.clearTimeout(id);
  }, [state.wrongFlash]);

  useEffect(() => {
    if (state.status === "won" && prevStatusRef.current !== "won") {
      playStageClearAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    if (state.status === "won") {
      reportScore(GAME_SLUG, computeScore(state));
      recordGameEnd({ score: computeScore(state), outcome: "clear" });
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, reportScore, recordGameEnd]);

  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    resetSession();
    resetGameAudioPrime();
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    resetSession();
    resetGameAudioPrime();
    dispatch({ type: "restart" });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-3 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <div className="flex gap-2">
          <ScoreBox label="Score" value={computeScore(state)} />
          <ScoreBox label="Best" value={feel.bestScore} />
        </div>
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={handleRetry}>
          <RotateCcw />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Fill digits 1–9 to match sum clues</p>
      <PuzzlePlayField fieldRef={fieldRef} bursts={feel.bursts} className={PUZZLE_FIELD_CLASS}>
      <div className="grid w-full grid-cols-4 gap-0.5">
        {Array.from({ length: SIZE * SIZE }, (_, i) => {
          const r = Math.floor(i / SIZE);
          const c = i % SIZE;
          const cell = state.grid[r]![c]!;
          const sel = state.selected?.[0] === r && state.selected?.[1] === c;
          const wrong =
            state.wrongFlash?.[0] === r && state.wrongFlash?.[1] === c;
          if (cell.kind === "blank") {
            return <div key={i} className="aspect-square bg-muted" />;
          }
          if (cell.kind === "clue") {
            return (
              <div key={i} className="flex aspect-square flex-col justify-center bg-zinc-800 p-1 text-[10px] leading-tight text-muted-foreground">
                {(cell as ClueCell).down !== undefined ? (
                  <span className="text-center">{(cell as ClueCell).down}</span>
                ) : null}
                {(cell as ClueCell).across !== undefined ? (
                  <span className="text-right">{(cell as ClueCell).across}</span>
                ) : null}
              </div>
            );
          }
          return (
            <button
              key={i}
              type="button"
              disabled={!canPlayRef.current || state.status === "won"}
              onClick={() => {
                primeGameAudio();
                playGameFeel("button", fieldRef.current);
                dispatch({ type: "select", row: r, col: c });
              }}
              className={cn(
                "aspect-square min-h-11 min-w-11 border text-lg font-bold transition-transform duration-150 active:scale-95",
                wrong && "border-destructive bg-destructive/20",
                sel && !wrong ? "border-primary bg-primary/10" : !wrong ? "border-border bg-background" : ""
              )}
            >
              {state.entries[r]![c] ?? ""}
            </button>
          );
        })}
      </div>
      </PuzzlePlayField>
      <div className="flex max-w-sm flex-wrap justify-center gap-1">
        {DIGITS.map((n) => (
          <Button
            key={n}
            variant="outline"
            size="sm"
            disabled={!state.selected || state.status === "won"}
            onClick={() => {
              primeGameAudio();
              playGameFeel("button", fieldRef.current);
              dispatch({ type: "digit", n });
            }}
          >
            {n}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          disabled={!state.selected}
          onClick={() => {
            primeGameAudio();
            playGameFeel("button", fieldRef.current);
            dispatch({ type: "clear" });
          }}
        >
          Clear
        </Button>
      </div>
      {state.status === "won" ? (
        <StandardGameOverOverlay
          message="Kakuro solved!"
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
        <ResumeDialog gameTitle="Kakuro" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
    </div>
  );
}
