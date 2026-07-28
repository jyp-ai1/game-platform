"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { clearSave } from "./save";
import { emitGameExit } from "./game-exit";
import { emitGameRetry } from "./game-retry";
import { createEffectBurst, triggerEffect, type EffectBurst, tickEffects } from "./effects";
import { loadGameProgress, type GameProgressStats } from "./game-progress";
import { getGameRuleGroup } from "./game-rule-groups";
import type { GameOutcome } from "./game-standard";
import { useGameSlug } from "./game-slug-context";
import {
  playFailSound,
  playGameOverSound,
  playStageClearSound,
  playStartSound,
  playSuccessSound,
} from "./sound";
import { useAutoSave, type SaveIndicatorStatus } from "./use-auto-save";
import { useGameSDK } from "./context";
import { useGameSession } from "./use-game-session";
import { useReadyCountdown, type UseReadyCountdownResult } from "./use-ready-countdown";
import {
  useResumableGame,
  type ResumePhase,
  type UseResumableGameResult,
} from "./use-resumable-game";

export interface UseGameFrameworkOptions<TState> {
  slug?: string;
  createInitialState: () => TState;
  /** Current game state — required for auto-save. */
  state: TState;
  /** Stage-based games — enables stage-clear result flow. */
  hasStages?: boolean;
  /** Auto-save predicate — return null when run is terminal. */
  getSaveState?: (state: TState) => TState | null;
}

export interface GameFrameworkResultFlow {
  handleRetry: () => void;
  handleExit: (score: number, outcome?: GameOutcome, stageReached?: number) => void;
  handleGameOver: (score: number, stageReached?: number) => void;
  handleStageClear: (stageIndex: number, score: number) => void;
  handleVictory: (score: number, stageReached?: number) => void;
}

export interface UseGameFrameworkResult<TState> extends UseResumableGameResult<TState> {
  slug: string;
  countdown: UseReadyCountdownResult;
  sessionActive: boolean;
  saveStatus: SaveIndicatorStatus;
  progress: GameProgressStats;
  ruleGroup: ReturnType<typeof getGameRuleGroup>;
  reportScore: (score: number) => void;
  session: ReturnType<typeof useGameSession>;
  result: GameFrameworkResultFlow;
  effects: {
    bursts: EffectBurst[];
    pop: (xPct?: number, yPct?: number) => void;
    success: () => void;
    fail: () => void;
    combo: () => void;
    flash: (target?: HTMLElement | null) => void;
  };
}

/**
 * Sprint 14 — unified hook: Progress · Result · Stage · Sound · Effect · Exit · Save.
 * Drop-in replacement for scattered useResumableGame + useReadyCountdown + useAutoSave + useGameSession.
 */
export function useGameFramework<TState>(
  options: UseGameFrameworkOptions<TState>
): UseGameFrameworkResult<TState> {
  const contextSlug = useGameSlug();
  const slug = options.slug ?? contextSlug ?? "unknown";
  const resumable = useResumableGame(slug, options.createInitialState);
  const countdown = useReadyCountdown(resumable.phase, slug);
  const sessionActive = resumable.phase === "ready" && !countdown.showCountdown;
  const session = useGameSession(slug, sessionActive);
  const { reportScore: sdkReportScore } = useGameSDK();
  const progress = loadGameProgress(slug);
  const ruleGroup = getGameRuleGroup(slug);

  const saveStatus = useAutoSave(
    slug,
    () => (options.getSaveState ? options.getSaveState(options.state) : null),
    [options.state]
  );

  const [bursts, setBursts] = useState<EffectBurst[]>([]);
  const burstTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionActive) return;
    playStartSound();
  }, [sessionActive]);

  useEffect(() => {
    if (bursts.length === 0) return;
    if (burstTimer.current != null) return;
    burstTimer.current = window.setInterval(() => {
      setBursts((prev) => {
        const next = tickEffects(prev);
        if (next.length === 0 && burstTimer.current != null) {
          window.clearInterval(burstTimer.current);
          burstTimer.current = null;
        }
        return next;
      });
    }, 32);
    return () => {
      if (burstTimer.current != null) {
        window.clearInterval(burstTimer.current);
        burstTimer.current = null;
      }
    };
  }, [bursts.length]);

  const addBurst = useCallback((kind: EffectBurst["kind"], xPct = 50, yPct = 50) => {
    triggerEffect(kind);
    setBursts((prev) => [...prev, createEffectBurst(kind, xPct, yPct)].slice(-40));
  }, []);

  const reportScore = useCallback(
    (score: number) => {
      sdkReportScore(slug, score);
    },
    [sdkReportScore, slug]
  );

  const handleRetry = useCallback(() => {
    session.recordGameRetry();
    session.resetSession();
    emitGameRetry(slug);
  }, [session, slug]);

  const handleExit = useCallback(
    (score: number, outcome: GameOutcome = "exit", stageReached?: number) => {
      session.recordGameEnd({ score, outcome, stageReached });
      emitGameExit(slug);
      clearSave(slug);
    },
    [session, slug]
  );

  const handleGameOver = useCallback(
    (score: number, stageReached?: number) => {
      playFailSound();
      playGameOverSound();
      triggerEffect("shake");
      session.recordGameEnd({ score, outcome: "failure", stageReached });
      reportScore(score);
      clearSave(slug);
    },
    [session, reportScore, slug]
  );

  const handleStageClear = useCallback(
    (stageIndex: number, score: number) => {
      playStageClearSound();
      playSuccessSound();
      triggerEffect("success");
      session.recordStageClear(stageIndex, score);
      reportScore(score);
    },
    [session, reportScore]
  );

  const handleVictory = useCallback(
    (score: number, stageReached?: number) => {
      playStageClearSound();
      playSuccessSound();
      triggerEffect("combo");
      session.recordGameEnd({ score, outcome: "victory", stageReached });
      reportScore(score);
      clearSave(slug);
    },
    [session, reportScore, slug]
  );

  return {
    ...resumable,
    slug,
    countdown,
    sessionActive,
    saveStatus,
    progress,
    ruleGroup,
    reportScore,
    session,
    result: {
      handleRetry,
      handleExit,
      handleGameOver,
      handleStageClear,
      handleVictory,
    },
    effects: {
      bursts,
      pop: (xPct, yPct) => addBurst("pop", xPct, yPct),
      success: () => triggerEffect("success"),
      fail: () => triggerEffect("shake"),
      combo: () => triggerEffect("combo"),
      flash: (target) => triggerEffect("flash", target ?? undefined),
    },
  };
}
