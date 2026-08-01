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
  useReadyCountdown,
  useResumableGame,
  standardFeelFromState,
  useStandardGameFeel,
} from "@game-platform/game-sdk";
import { Button, ReadyCountdown, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  clearGroup,
  COLOR_HEX,
  COLS,
  createRandomBoard,
  hasValidMove,
  isBoardEmpty,
  computeGroupScore,
  type Board,
} from "./engine";

const GAME_SLUG = "samegame";

interface State {
  board: Board;
  score: number;
  status: "playing" | "over" | "won";
}

type Action = { type: "clear"; row: number; col: number } | { type: "restart" };

function createInitialState(): State {
  let board = createRandomBoard();
  while (!hasValidMove(board)) {
    board = createRandomBoard();
  }
  return { board, score: 0, status: "playing" };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "clear": {
      if (state.status === "over") {
        return state;
      }
      const { board, cleared } = clearGroup(state.board, action.row, action.col);
      if (cleared === 0) {
        return state;
      }
      const score = state.score + computeGroupScore(cleared);
      if (hasValidMove(board)) {
        return { board, score, status: "playing" };
      }
      return {
        board,
        score,
        status: isBoardEmpty(board) ? "won" : "over",
      };
    }
    default:
      return state;
  }
}

export function SameGameGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const { canPlayRef, showCountdown, completeCountdown } = useReadyCountdown(phase);
  const completeCountdownRef = useRef(completeCountdown);
  completeCountdownRef.current = completeCountdown;
  const onCountdownComplete = useCallback(() => {
    completeCountdownRef.current();
  }, []);

  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();
  const fieldRef = useRef<HTMLDivElement>(null);
  const feel = useStandardGameFeel(GAME_SLUG, {
    ...standardFeelFromState(state as unknown as Record<string, unknown>),
    fieldRef,
  });

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "over" || state.status === "won" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status === "over" || state.status === "won") {
      playGameFeel(state.status === "won" ? "goal" : "wrong", fieldRef.current);
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, reportScore]);

  function handleRetry() {
    emitGameRetry(GAME_SLUG);
    dispatch({ type: "restart" });
  }

  function handleNewGame() {
    onNewGame();
    dispatch({ type: "restart" });
  }

  function handleClick(row: number, col: number) {
    if (!canPlayRef.current) {
      return;
    }
    playGameFeel("pop", fieldRef.current);
    dispatch({ type: "clear", row, col });
  }

  return (
    <div className="standard-game-shell relative flex flex-col items-center gap-4 mx-auto w-full max-w-md px-2 sm:px-0 landscape:gap-2 touch-manipulation">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Score" value={state.score} />
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={handleRetry}
        >
          <RotateCcw />
        </Button>
      </div>

      <PuzzlePlayField fieldRef={fieldRef} bursts={feel.bursts} className="touch-none">
      <div
        className="grid w-full gap-1 rounded-xl bg-muted p-1"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
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
            onExit={feel.handleExit}
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
