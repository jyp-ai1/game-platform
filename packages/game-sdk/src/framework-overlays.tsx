"use client";

import { GameOverOverlay, ReadyCountdown } from "@game-platform/ui";

import { ResumeDialog } from "./resume-dialog";
import type { GameOutcome } from "./game-standard";
import type { ResumePhase } from "./use-resumable-game";

type GameOverVariant = "stage-clear" | "game-over";

export interface FrameworkResultOverlayProps {
  slug: string;
  phase: ResumePhase;
  showCountdown: boolean;
  onCountdownComplete: () => void;
  onResume: () => void;
  onNewGame: () => void;
  gameTitle: string;
  /** Terminal overlay visibility */
  visible: boolean;
  variant?: GameOverVariant;
  score?: number;
  stageLabel?: string;
  message?: string;
  onRetry: () => void;
  onRestart: () => void;
  onExit: (score: number, outcome?: GameOutcome, stageReached?: number) => void;
  onNextStage?: () => void;
  onContinue?: () => void;
  stageReached?: number;
  outcome?: GameOutcome;
}

/**
 * Sprint 14 — standard Result Flow overlay.
 * START → PLAY → GAME OVER / STAGE CLEAR → Retry · Exit · Next Stage
 */
export function FrameworkResultOverlay({
  slug,
  phase,
  showCountdown,
  onCountdownComplete,
  onResume,
  onNewGame,
  gameTitle,
  visible,
  variant = "game-over",
  score = 0,
  stageLabel,
  message,
  onRetry,
  onRestart,
  onExit,
  onNextStage,
  onContinue,
  stageReached,
  outcome = "failure",
}: FrameworkResultOverlayProps) {
  return (
    <>
      {phase === "resume-prompt" ? (
        <ResumeDialog gameTitle={gameTitle} onResume={onResume} onNewGame={onNewGame} />
      ) : null}
      {showCountdown ? <ReadyCountdown onComplete={onCountdownComplete} /> : null}
      {visible ? (
        <GameOverOverlay
          variant={variant}
          gameSlug={slug}
          score={score}
          stageLabel={stageLabel}
          message={message}
          onRetry={onRetry}
          onRestart={onRestart}
          onExit={() => onExit(score, outcome, stageReached)}
          onNextStage={onNextStage}
          onContinue={onContinue}
        />
      ) : null}
    </>
  );
}
