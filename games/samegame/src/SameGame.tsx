"use client";

import {
  clearSave,
  ResumeDialog,
  SaveIndicator,
  useAutoSave,
  useGameSDK,
  useResumableGame,
} from "@game-platform/game-sdk";
import { Button, GameOverOverlay, ScoreBox } from "@game-platform/ui";
import { RotateCcw } from "lucide-react";
import { useEffect, useReducer } from "react";

import {
  clearGroup,
  COLOR_HEX,
  COLS,
  createRandomBoard,
  hasValidMove,
  computeGroupScore,
  type Board,
} from "./engine";

const GAME_SLUG = "samegame";

interface State {
  board: Board;
  score: number;
  status: "playing" | "over";
}

type Action = { type: "clear"; row: number; col: number } | { type: "restart" };

function createInitialState(): State {
  return { board: createRandomBoard(), score: 0, status: "playing" };
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
      return {
        board,
        score,
        status: hasValidMove(board) ? "playing" : "over",
      };
    }
    default:
      return state;
  }
}

export function SameGameGame() {
  const { phase, initialState, phaseRef, onResume, onNewGame } =
    useResumableGame(GAME_SLUG, createInitialState);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { reportScore } = useGameSDK();

  const saveStatus = useAutoSave(
    GAME_SLUG,
    () => (state.status === "over" ? null : state),
    [state]
  );

  useEffect(() => {
    if (state.status === "over") {
      reportScore(GAME_SLUG, state.score);
      clearSave(GAME_SLUG);
    }
  }, [state.status, state.score, reportScore]);

  function handleClick(row: number, col: number) {
    if (phaseRef.current !== "ready") {
      return;
    }
    dispatch({ type: "clear", row, col });
  }

  return (
    <div className="relative flex flex-col items-center gap-4">
      <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
      <div className="flex w-full max-w-sm items-center justify-between">
        <ScoreBox label="Score" value={state.score} />
        <Button
          variant="outline"
          size="icon"
          aria-label="새 게임"
          onClick={() => dispatch({ type: "restart" })}
        >
          <RotateCcw />
        </Button>
      </div>

      <div
        className="relative grid w-full max-w-sm gap-1"
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
              className="aspect-square rounded-sm transition-transform hover:scale-95 disabled:cursor-default"
              style={{ backgroundColor: color ? COLOR_HEX[color] : "transparent" }}
            />
          ))
        )}

        {state.status === "over" ? (
          <GameOverOverlay
            message="Game Over"
            onRestart={() => dispatch({ type: "restart" })}
          />
        ) : null}

        {phase === "resume-prompt" ? (
          <ResumeDialog
            gameTitle="SameGame"
            onResume={onResume}
            onNewGame={onNewGame}
          />
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        같은 색 타일이 2개 이상 인접하면 클릭해 제거하세요. 더 이상 지울 수
        있는 그룹이 없으면 게임이 끝납니다.
      </p>
    </div>
  );
}
