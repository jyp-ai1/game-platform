"use client";

import {
  clearSave,
  emitGameRetry,
  feelWithScore,
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
  useStandardGameFeel,
} from "@game-platform/game-sdk";
import { Button, cn, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { Fragment, useCallback, useEffect, useReducer, useRef } from "react";

import {
  computeScore,
  createInitialState,
  formatHint,
  markEmpty,
  puzzleSize,
  toggleCell,
  clearWrongFlash,
  type NonogramState,
} from "./engine";
import {
  FINAL_NONOGRAM_STAGE,
  getNonogramPuzzle,
} from "./nonogram-stage-config";
import {
  playScoreAudio,
  playStageClearAudio,
  playWrongAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "nonogram";
const PUZZLE_FIELD_CLASS = "touch-none max-w-[min(100%,20.5rem)]";

type Action =
  | { type: "fill"; row: number; col: number }
  | { type: "empty"; row: number; col: number }
  | { type: "clearFlash" }
  | { type: "restart"; stageIndex?: number }
  | { type: "nextStage" };

function reducer(state: NonogramState, action: Action): NonogramState {
  switch (action.type) {
    case "restart":
      return createInitialState(action.stageIndex ?? 1);
    case "nextStage":
      if (state.stageIndex >= FINAL_NONOGRAM_STAGE) {
        return { ...state, status: "won" };
      }
      return createInitialState(state.stageIndex + 1);
    case "fill":
      return toggleCell(state, action.row, action.col);
    case "empty":
      return markEmpty(state, action.row, action.col);
    case "clearFlash":
      return clearWrongFlash(state);
    default:
      return state;
  }
}

export function NonogramGame() {
  const { phase, initialState, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

  const sessionActive = phase === "ready" && !showCountdown;
  const { recordStageClear, recordGameEnd, resetSession } =
    useGameSession(GAME_SLUG, sessionActive);
  const stageClearReported = useRef(false);

  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const prevStatusRef = useRef(state.status);
  const prevMarksRef = useRef<string>("");
  const score = computeScore(state);
  const size = puzzleSize(state);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...feelWithScore(state as unknown as Record<string, unknown>, score),
    stageIndex: state.stageIndex,
    fieldRef,
  });

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "won" || state.status === "stage-clear" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status === "stage-clear" && prevStatusRef.current !== "stage-clear") {
      playStageClearAudio();
      playGameFeel("goal", fieldRef.current);
    } else if (state.status === "won" && prevStatusRef.current !== "won") {
      playStageClearAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    if (state.status === "stage-clear" && !stageClearReported.current) {
      stageClearReported.current = true;
      recordStageClear(state.stageIndex, score);
      reportScore(GAME_SLUG, score);
    }
    if (state.status === "playing") {
      stageClearReported.current = false;
    }
  }, [state.status, state.stageIndex, score, recordStageClear, reportScore]);

  useEffect(() => {
    if (state.status === "won") {
      reportScore(GAME_SLUG, score);
      recordGameEnd({ score, outcome: "clear", stageReached: state.stageIndex });
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, score, state.stageIndex, reportScore, recordGameEnd]);

  useEffect(() => {
    const marksKey = state.marks.map((r) => r.map((m) => (m === true ? "1" : m === false ? "0" : ".")).join("")).join("|");
    if (prevMarksRef.current && marksKey !== prevMarksRef.current && state.status === "playing") {
      playScoreAudio();
    }
    prevMarksRef.current = marksKey;
  }, [state.marks, state.status]);

  useEffect(() => {
    if (!state.wrongFlash) return;
    playWrongAudio();
    playGameFeel("wrong", fieldRef.current);
    const id = window.setTimeout(() => dispatch({ type: "clearFlash" }), 400);
    return () => window.clearTimeout(id);
  }, [state.wrongFlash]);

  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry(stageIndex?: number) {
    emitGameRetry(GAME_SLUG);
    resetSession();
    resetGameAudioPrime();
    dispatch({ type: "restart", stageIndex });
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
      <div className="flex w-full max-w-sm flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <ScoreBox label="Stage" value={state.stageIndex} />
          <ScoreBox label="Best" value={feel.bestScore} />
          <ScoreBox label="Best Stage" value={feel.bestStage} />
        </div>
        <Button variant="outline" size="icon" aria-label="새 게임" onClick={() => handleRetry()}>
          <RotateCcw />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Stage {state.stageIndex}: {state.puzzle.label} — tap to fill, right-click empty
      </p>
      <PuzzlePlayField fieldRef={fieldRef} bursts={feel.bursts} className={PUZZLE_FIELD_CLASS}>
        <div className="w-full max-w-sm">
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `auto repeat(${size}, minmax(0, 1fr))` }}
          >
            <div />
            {state.colHints.map((h, i) => (
              <div key={`c${i}`} className="flex aspect-square items-end justify-center text-[10px] font-mono sm:text-xs">
                {formatHint(h)}
              </div>
            ))}
            {state.rowHints.map((h, r) => (
              <Fragment key={`row-${r}`}>
                <div className="flex aspect-square items-center justify-end pr-0.5 text-[10px] font-mono sm:text-xs">
                  {formatHint(h)}
                </div>
                {Array.from({ length: size }, (_, c) => {
                  const mark = state.marks[r]![c];
                  const isWrongFlash =
                    state.wrongFlash?.[0] === r && state.wrongFlash?.[1] === c;
                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      disabled={!canPlayRef.current || state.status !== "playing"}
                      onClick={() => {
                        primeGameAudio();
                        playGameFeel("button", fieldRef.current);
                        dispatch({ type: "fill", row: r, col: c });
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        dispatch({ type: "empty", row: r, col: c });
                      }}
                      className={cn(
                        "aspect-square w-full min-h-11 min-w-11 border border-border text-[10px] transition-transform duration-150 active:scale-95 sm:text-xs",
                        mark === true && "bg-primary",
                        mark === false && "text-muted-foreground",
                        isWrongFlash && "animate-pulse bg-destructive"
                      )}
                    >
                      {mark === false ? "×" : ""}
                    </button>
                  );
                })}
              </Fragment>
            ))}
          </div>

          {state.status === "stage-clear" ? (
            <StandardGameOverOverlay
              variant="stage-clear"
              stageLabel={`${getNonogramPuzzle(state.stageIndex).label} — Stage ${state.stageIndex} Clear`}
              score={score}
              gameSlug={GAME_SLUG}
              isNewBest={feel.isNewBest}
              bestRecordDelta={feel.bestRecordDelta}
              onExit={handleExit}
              onRetry={handleRetry}
              onRestart={handleRetry}
              onNextStage={() => dispatch({ type: "nextStage" })}
            />
          ) : null}

          {state.status === "won" ? (
            <StandardGameOverOverlay
              message="All puzzles complete!"
              score={score}
              gameSlug={GAME_SLUG}
              isNewBest={feel.isNewBest}
              bestRecordDelta={feel.bestRecordDelta}
              onExit={handleExit}
              onRetry={handleRetry}
              onRestart={handleRetry}
            />
          ) : null}

          {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}
        </div>
      </PuzzlePlayField>
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle="Nonogram" onResume={onResume} onNewGame={handleNewGame} />
      ) : null}
    </div>
  );
}
