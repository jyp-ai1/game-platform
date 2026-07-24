"use client";

import { RotateCcw, Trophy } from "lucide-react";

import { Button, buttonVariants } from "./button";
import { cn } from "./lib/utils";

export function GameOverOverlay({
  message,
  onRestart,
  score,
  gameSlug,
  onRetry,
}: {
  message: string;
  onRestart: () => void;
  score?: number;
  gameSlug?: string;
  /** Called before restart — e.g. analytics retry tracking */
  onRetry?: () => void;
}) {
  function handleRestart() {
    onRetry?.();
    onRestart();
  }

  function scrollToRanking() {
    document.getElementById("leaderboard")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-xl bg-background/85 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Complete
        </p>
        <p className="text-xl font-semibold">{message}</p>
        {score !== undefined ? (
          <p className="text-2xl font-bold tabular-nums text-primary">{score.toLocaleString()}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={handleRestart} className="gap-2">
          <RotateCcw className="size-4" />
          Retry
        </Button>
        <Button variant="outline" onClick={scrollToRanking} className="gap-2">
          <Trophy className="size-4" />
          Ranking
        </Button>
        {gameSlug ? (
          <a href="/games" className={cn(buttonVariants({ variant: "secondary" }))}>
            Next Game
          </a>
        ) : null}
      </div>
    </div>
  );
}
