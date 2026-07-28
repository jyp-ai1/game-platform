"use client";

import { useEffect, useRef } from "react";

import {
  createEffectBurst,
  tickEffects,
  triggerEffect,
  triggerScreenShake,
  type EffectBurst,
} from "./effects";
import { loadGameProgress, type GameProgressStats } from "./game-progress";
import { emitGameExit } from "./game-exit";
import { clearSave } from "./save";
import {
  playComboSound,
  playFailSound,
  playGameOverSound,
  playPopSound,
  playStageClearSound,
  playSuccessSound,
} from "./sound";

export interface StandardGameFeelOptions {
  status: string;
  score: number;
  stageIndex?: number;
  fieldRef?: React.RefObject<HTMLElement | null>;
  /** Disable score-gain feedback (games with custom pop logic). */
  muteScoreGain?: boolean;
}

/** Map heterogeneous game state → standard feel inputs. */
export function standardFeelFromState(state: Record<string, unknown>): {
  status: string;
  score: number;
  stageIndex?: number;
} {
  let status = "playing";
  if (typeof state.status === "string") {
    status = state.status;
  } else if (state.winner != null || state.gameOver === true) {
    status = "over";
  } else if (state.won === true) {
    status = "won";
  }

  let score = 0;
  if (typeof state.score === "number") {
    score = state.score;
  } else if (typeof state.playerScore === "number") {
    score = state.playerScore;
  } else if (typeof state.points === "number") {
    score = state.points;
  }

  const stageIndex = typeof state.stageIndex === "number" ? state.stageIndex : undefined;
  return { status, score, stageIndex };
}

type NormalizedStatus = "playing" | "over" | "won" | "stage-clear";

function normalizeStatus(raw: string): NormalizedStatus {
  if (raw === "stage-clear") return "stage-clear";
  if (raw === "won" || raw === "victory" || raw === "clear") return "won";
  if (raw === "over" || raw === "lost" || raw === "game-over" || raw === "failure") {
    return "over";
  }
  return "playing";
}

function isPlaying(raw: string): boolean {
  return normalizeStatus(raw) === "playing";
}

/**
 * Sprint 14 — apply Sound + Effect + Progress feedback uniformly.
 * One hook call per game; no per-game sound logic needed.
 */
export function useStandardGameFeel(
  slug: string,
  options: StandardGameFeelOptions
): {
  progress: GameProgressStats;
  bestScore: number;
  bestStage: number;
  isNewBest: boolean;
  bestRecordDelta: number | undefined;
  bursts: EffectBurst[];
  handleExit: () => void;
} {
  const progress = loadGameProgress(slug);
  const prevStatus = useRef(options.status);
  const prevScore = useRef(options.score);
  const burstsRef = useRef<EffectBurst[]>([]);
  const burstStateRef = useRef(0);

  const normalized = normalizeStatus(options.status);
  const isNewBest =
    normalized !== "playing" && options.score > 0 && options.score >= progress.bestScore;
  const bestRecordDelta =
    isNewBest && options.score > progress.bestScore
      ? options.score - progress.bestScore
      : undefined;

  useEffect(() => {
    if (prevStatus.current === options.status) return;
    const next = normalizeStatus(options.status);
    const field = options.fieldRef?.current ?? null;

    if (next === "stage-clear") {
      playStageClearSound();
      playSuccessSound();
      triggerEffect("success", field);
    } else if (next === "won") {
      playStageClearSound();
      playSuccessSound();
      triggerEffect("combo", field);
    } else if (next === "over") {
      playFailSound();
      playGameOverSound();
      triggerScreenShake(field);
    }
    prevStatus.current = options.status;
  }, [options.status, options.fieldRef]);

  useEffect(() => {
    if (options.muteScoreGain || !isPlaying(options.status)) {
      prevScore.current = options.score;
      return;
    }
    const gain = options.score - prevScore.current;
    if (gain > 0) {
      const field = options.fieldRef?.current ?? null;
      if (gain >= 50) {
        playComboSound();
        triggerEffect("combo", field);
      } else if (gain >= 15) {
        playSuccessSound();
        triggerEffect("success", field);
      } else {
        playPopSound();
        triggerEffect("pop", field);
      }
      burstsRef.current = [
        ...burstsRef.current,
        createEffectBurst(gain >= 30 ? "combo" : "pop", 50, 40),
      ].slice(-20);
      burstStateRef.current += 1;
    }
    prevScore.current = options.score;
  }, [options.score, options.status, options.muteScoreGain, options.fieldRef]);

  function handleExit() {
    emitGameExit(slug);
    clearSave(slug);
  }

  return {
    progress,
    bestScore: Math.max(progress.bestScore, options.score),
    bestStage: Math.max(progress.bestStage, options.stageIndex ?? progress.currentStage),
    isNewBest,
    bestRecordDelta,
    bursts: burstsRef.current,
    handleExit,
  };
}
