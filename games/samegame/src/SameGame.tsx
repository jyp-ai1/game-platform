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
import { Button, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  clearGroup,
  COLOR_HEX,
  computeGroupScore,
  createInitialState,
  hasValidMove,
  isBoardEmpty,
  BOARD_CLEAR_BONUS,
  type SameGameDifficulty,
  type SameGameState,
} from "./engine";
import {
  SAMEGAME_DIFFICULTIES,
  difficultyLabel,
} from "./samegame-stage-config";
import {
  playGameOverAudio,
  playStageClearAudio,
  primeGameAudio,
  resetGameAudioPrime,
} from "./game-audio-prime";

const GAME_SLUG = "samegame";
const PUZZLE_FIELD_CLASS = "touch-none max-w-[min(100%,20.5rem)]";

type Action =
  | { type: "clear"; row: number; col: number }
  | { type: "restart"; difficulty?: SameGameDifficulty };

function reducer(state: SameGameState, action: Action): SameGameState {
  switch (action.type) {
    case "restart":
      return createInitialState(action.difficulty ?? state.difficulty);
    case "clear": {
      if (state.status === "over") {
        return state;
      }
      const { board, cleared } = clearGroup(
        state.board,
        action.row,
        action.col,
        state.rows,
        state.cols
      );
      if (cleared === 0) {
        return state;
      }
      const score = state.score + computeGroupScore(cleared);
      if (hasValidMove(board, state.rows, state.cols)) {
        return { ...state, board, score, status: "playing" };
      }
      const clearedBoard = isBoardEmpty(board);
      return {
        ...state,
        board,
        score: clearedBoard ? score + BOARD_CLEAR_BONUS : score,
        status: clearedBoard ? "won" : "over",
      };
    }
    default:
      return state;
  }
}

export function SameGameGame() {
  const { phase, initialState, onResume, onNewGame } =
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
  const prevScoreRef = useRef(state.score);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...feelWithScore(state as unknown as Record<string, unknown>, state.score),
    fieldRef,
  });

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "over" || state.status === "won" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status === "won" && prevStatusRef.current !== "won") {
      playStageClearAudio();
    } else if (state.status === "over" && prevStatusRef.current !== "over") {
      playGameOverAudio();
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      const gain = state.score - prevScoreRef.current;
      playGameFeel(gain >= 20 ? "combo" : "pop", fieldRef.current);
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

  useEffect(() => {
    if (state.status === "over" || state.status === "won") {
      reportScore(GAME_SLUG, state.score);
      recordGameEnd({
        score: state.score,
        outcome: state.status === "won" ? "clear" : "failure",
      });
      clearSave(GAME_SLUG);
      const guard = window.setTimeout(() => clearSave(GAME_SLUG), 400);
      return () => window.clearTimeout(guard);
    }
  }, [state.status, state.score, reportScore, recordGameEnd]);

  function handleExit() {
    clearSave(GAME_SLUG);
    feel.handleExit();
    window.setTimeout(() => clearSave(GAME_SLUG), 400);
  }

  function handleRetry(difficulty?: SameGameDifficulty) {
    emitGameRetry(GAME_SLUG);
    resetSession();
    resetGameAudioPrime();
    prevScoreRef.current = 0;
    dispatch({ type: "restart", difficulty });
  }

  function handleNewGame() {
    onNewGame();
    resetSession();
    resetGameAudioPrime();
    prevScoreRef.current = 0;
    dispatch({ type: "restart" });
  }

  function handleClick(row: number, col: number) {
    if (!canPlayRef.current) {
      return;
    }
    primeGameAudio();
    playGameFeel("pop", fieldRef.current);
    dispatch({ type: "clear", row, col });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-3 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <ScoreBox label="Score" value={state.score} />
          <ScoreBox label="Best" value={feel.bestScore} />
          <ScoreBox label="Best Stage" value={feel.bestStage} />
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={() => handleRetry()}
        >
          <RotateCcw />
        </Button>
      </div>
      <div className="flex w-full max-w-sm flex-wrap gap-1">
        {SAMEGAME_DIFFICULTIES.map((level) => (
          <Button
            key={level}
            variant={state.difficulty === level ? "default" : "outline"}
            size="sm"
            className="min-h-9 flex-1 text-xs"
            onClick={() => handleRetry(level)}
          >
            {difficultyLabel(level)}
          </Button>
        ))}
      </div>

      <PuzzlePlayField fieldRef={fieldRef} bursts={feel.bursts} className={PUZZLE_FIELD_CLASS}>
        <div
          className="grid w-full gap-1 rounded-xl bg-muted p-1"
          style={{ gridTemplateColumns: `repeat(${state.cols}, minmax(0, 1fr))` }}
        >
          {state.board.map((rowCells, row) =>
            rowCells.map((color, col) => (
              <button
                key={`${row}-${col}`}
                type="button"
                onClick={() => handleClick(row, col)}
                disabled={!color}
                aria-label={color ? `${color} 타일 (${row}, ${col})` : "빈 칸"}
                className="aspect-square min-h-11 min-w-11 rounded-sm transition-transform duration-150 active:scale-95 hover:scale-95 disabled:cursor-default"
                style={{ backgroundColor: color ? COLOR_HEX[color] : "transparent" }}
              />
            ))
          )}

          {(state.status === "won" || state.status === "over") ? (
            <StandardGameOverOverlay
              message={state.status === "won" ? "Board Clear!" : "Game Over"}
              score={state.score}
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
        <ResumeDialog
          gameTitle="SameGame"
          onResume={onResume}
          onNewGame={handleNewGame}
        />
      ) : null}

      <p className="text-xs text-muted-foreground">
        같은 색 타일이 2개 이상 인접하면 클릭해 제거하세요. 더 이상 지울 수
        있는 그룹이 없으면 게임이 끝납니다.
      </p>
    </div>
  );
}
