"use client";

import { createElement, useEffect, useRef, type ReactNode, type RefObject } from "react";

import {
  DIFFICULTY_STAGE,
  humanVsCpuStatus,
  type BoardGameStatus,
  type CpuDifficulty,
} from "./board-game-status";
import { GameFeelLayer } from "./game-feel-layer";
import { playGameFeel } from "./game-feel-events";
import { useStandardGameFeel } from "./use-standard-game-feel";

/** Human vs CPU board games — status, difficulty, feel wiring (Pass 2 + 3). */
export function useHumanVsCpuFeel(
  slug: string,
  options: {
    winner: null | "draw" | string | number;
    humanSide: string | number;
    cpuSide: string | number;
    difficulty: CpuDifficulty;
    score: number;
  }
): {
  fieldRef: RefObject<HTMLDivElement | null>;
  feel: ReturnType<typeof useStandardGameFeel>;
  gameStatus: BoardGameStatus;
  feelTap: () => void;
  FeelLayer: () => ReactNode;
} {
  const fieldRef = useRef<HTMLDivElement>(null);
  const gameStatus = humanVsCpuStatus(options.winner, options.humanSide, options.cpuSide);
  const feel = useStandardGameFeel(slug, {
    status: gameStatus,
    score: options.score,
    stageIndex: DIFFICULTY_STAGE[options.difficulty],
    fieldRef,
  });

  useEffect(() => {
    if (options.winner === null) return;
    if (options.winner === options.humanSide) {
      playGameFeel("goal", fieldRef.current);
    } else if (options.winner === "draw") {
      playGameFeel("button", fieldRef.current);
    } else if (options.winner === options.cpuSide) {
      playGameFeel("wrong", fieldRef.current);
    }
  }, [options.winner, options.humanSide, options.cpuSide]);

  function feelTap() {
    playGameFeel("button", fieldRef.current);
  }

  function FeelLayer() {
    return feel.bursts.length
      ? createElement(GameFeelLayer, { bursts: feel.bursts })
      : null;
  }

  return { fieldRef, feel, gameStatus, feelTap, FeelLayer };
}
