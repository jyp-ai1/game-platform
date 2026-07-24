"use client";

import { GameSDKProvider, getDeviceId } from "@game-platform/game-sdk";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import type { PlayableSlug } from "@/lib/playable-games";
import { trackAnalyticsEvent } from "@/lib/supabase/analytics";
import { submitScore as submitScoreRpc } from "@/lib/supabase/scores";

async function submitScore(
  gameSlug: string,
  nickname: string,
  score: number,
  deviceId: string
): Promise<void> {
  await submitScoreRpc(gameSlug, nickname, score, deviceId);
  trackAnalyticsEvent("ranking_submit", {
    gameSlug,
    deviceId,
    metadata: { score, nickname },
  }).catch(() => {});
}

function Loading() {
  return (
    <div className="flex aspect-square w-full max-w-sm animate-pulse flex-col items-center justify-center gap-3 rounded-xl bg-muted">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">게임을 불러오는 중...</p>
    </div>
  );
}

// ssr:false is required here (games use browser-only APIs like localStorage/
// keyboard events) and is only allowed inside a Client Component.
//
// Adding a new game = one entry here + one slug in lib/playable-games.ts.
// Nothing else in the platform needs to change (see next.config.ts, which
// auto-discovers games/* for transpilePackages).
const gameComponents: Record<PlayableSlug, ComponentType> = {
  "2048": dynamic(
    () => import("@game-platform/game-2048").then((mod) => mod.Game2048),
    { ssr: false, loading: Loading }
  ),
  snake: dynamic(
    () => import("@game-platform/game-snake").then((mod) => mod.SnakeGame),
    { ssr: false, loading: Loading }
  ),
  breakout: dynamic(
    () =>
      import("@game-platform/game-breakout").then((mod) => mod.BreakoutGame),
    { ssr: false, loading: Loading }
  ),
  "arkanoid-dx": dynamic(
    () =>
      import("@game-platform/game-arkanoid-dx").then(
        (mod) => mod.ArkanoidDxGame
      ),
    { ssr: false, loading: Loading }
  ),
  memory: dynamic(
    () => import("@game-platform/game-memory").then((mod) => mod.MemoryGame),
    { ssr: false, loading: Loading }
  ),
  minesweeper: dynamic(
    () =>
      import("@game-platform/game-minesweeper").then(
        (mod) => mod.MinesweeperGame
      ),
    { ssr: false, loading: Loading }
  ),
  samegame: dynamic(
    () =>
      import("@game-platform/game-samegame").then((mod) => mod.SameGameGame),
    { ssr: false, loading: Loading }
  ),
  "maze-runner": dynamic(
    () =>
      import("@game-platform/game-maze-runner").then(
        (mod) => mod.MazeRunnerGame
      ),
    { ssr: false, loading: Loading }
  ),
  "tank-battle": dynamic(
    () =>
      import("@game-platform/game-tank-battle").then(
        (mod) => mod.TankBattleGame
      ),
    { ssr: false, loading: Loading }
  ),
  "galaxy-defender": dynamic(
    () =>
      import("@game-platform/game-galaxy-defender").then(
        (mod) => mod.GalaxyDefenderGame
      ),
    { ssr: false, loading: Loading }
  ),
  "space-defender": dynamic(
    () =>
      import("@game-platform/game-space-defender").then(
        (mod) => mod.SpaceDefenderGame
      ),
    { ssr: false, loading: Loading }
  ),
  "bubble-pop": dynamic(
    () =>
      import("@game-platform/game-bubble-pop").then((mod) => mod.BubblePopGame),
    { ssr: false, loading: Loading }
  ),
  sudoku: dynamic(
    () => import("@game-platform/game-sudoku").then((mod) => mod.SudokuGame),
    { ssr: false, loading: Loading }
  ),
  "tic-tac-toe": dynamic(
    () =>
      import("@game-platform/game-tic-tac-toe").then(
        (mod) => mod.TicTacToeGame
      ),
    { ssr: false, loading: Loading }
  ),
  simon: dynamic(
    () => import("@game-platform/game-simon").then((mod) => mod.SimonGame),
    { ssr: false, loading: Loading }
  ),
  hangman: dynamic(
    () => import("@game-platform/game-hangman").then((mod) => mod.HangmanGame),
    { ssr: false, loading: Loading }
  ),
  "color-match": dynamic(
    () =>
      import("@game-platform/game-color-match").then(
        (mod) => mod.ColorMatchGame
      ),
    { ssr: false, loading: Loading }
  ),
  "air-hockey": dynamic(
    () =>
      import("@game-platform/game-air-hockey").then(
        (mod) => mod.AirHockeyGame
      ),
    { ssr: false, loading: Loading }
  ),
  tetris: dynamic(
    () => import("@game-platform/game-tetris").then((mod) => mod.TetrisGame),
    { ssr: false, loading: Loading }
  ),
  "gold-miner": dynamic(
    () =>
      import("@game-platform/game-gold-miner").then(
        (mod) => mod.GoldMinerGame
      ),
    { ssr: false, loading: Loading }
  ),
  "space-impact": dynamic(
    () =>
      import("@game-platform/game-space-impact").then(
        (mod) => mod.SpaceImpactGame
      ),
    { ssr: false, loading: Loading }
  ),
  "stack-tower": dynamic(
    () =>
      import("@game-platform/game-stack-tower").then(
        (mod) => mod.StackTowerGame
      ),
    { ssr: false, loading: Loading }
  ),
  "ball-sort": dynamic(
    () =>
      import("@game-platform/game-ball-sort").then((mod) => mod.BallSortGame),
    { ssr: false, loading: Loading }
  ),
  "color-sort": dynamic(
    () =>
      import("@game-platform/game-color-sort").then((mod) => mod.ColorSortGame),
    { ssr: false, loading: Loading }
  ),
  "penalty-shootout": dynamic(
    () =>
      import("@game-platform/game-penalty-shootout").then(
        (mod) => mod.PenaltyShootoutGame
      ),
    { ssr: false, loading: Loading }
  ),
  darts: dynamic(
    () => import("@game-platform/game-darts").then((mod) => mod.DartsGame),
    { ssr: false, loading: Loading }
  ),
  "bubble-shooter": dynamic(
    () =>
      import("@game-platform/game-bubble-shooter").then(
        (mod) => mod.BubbleShooterGame
      ),
    { ssr: false, loading: Loading }
  ),
  "merge-blocks": dynamic(
    () =>
      import("@game-platform/game-merge-blocks").then(
        (mod) => mod.MergeBlocksGame
      ),
    { ssr: false, loading: Loading }
  ),
  connect4: dynamic(
    () => import("@game-platform/game-connect4").then((mod) => mod.Connect4Game),
    { ssr: false, loading: Loading }
  ),
  reversi: dynamic(
    () => import("@game-platform/game-reversi").then((mod) => mod.ReversiGame),
    { ssr: false, loading: Loading }
  ),
  gomoku: dynamic(
    () => import("@game-platform/game-gomoku").then((mod) => mod.GomokuGame),
    { ssr: false, loading: Loading }
  ),
  bowling: dynamic(
    () => import("@game-platform/game-bowling").then((mod) => mod.BowlingGame),
    { ssr: false, loading: Loading }
  ),
  archery: dynamic(
    () => import("@game-platform/game-archery").then((mod) => mod.ArcheryGame),
    { ssr: false, loading: Loading }
  ),
  "sliding-puzzle": dynamic(
    () =>
      import("@game-platform/game-sliding-puzzle").then(
        (mod) => mod.SlidingPuzzleGame
      ),
    { ssr: false, loading: Loading }
  ),
  "whack-a-mole": dynamic(
    () =>
      import("@game-platform/game-whack-a-mole").then(
        (mod) => mod.WhackAMoleGame
      ),
    { ssr: false, loading: Loading }
  ),
  chess: dynamic(
    () => import("@game-platform/game-chess").then((mod) => mod.ChessGame),
    { ssr: false, loading: Loading }
  ),
  checkers: dynamic(
    () => import("@game-platform/game-checkers").then((mod) => mod.CheckersGame),
    { ssr: false, loading: Loading }
  ),
  jigsaw: dynamic(
    () => import("@game-platform/game-jigsaw").then((mod) => mod.JigsawGame),
    { ssr: false, loading: Loading }
  ),
  mancala: dynamic(
    () => import("@game-platform/game-mancala").then((mod) => mod.MancalaGame),
    { ssr: false, loading: Loading }
  ),
  "mini-golf": dynamic(
    () =>
      import("@game-platform/game-mini-golf").then((mod) => mod.MiniGolfGame),
    { ssr: false, loading: Loading }
  ),
  billiards: dynamic(
    () =>
      import("@game-platform/game-billiards").then((mod) => mod.BilliardsGame),
    { ssr: false, loading: Loading }
  ),
};

export function GamePlayer({
  slug,
  rankingEnabled = true,
}: {
  slug: PlayableSlug;
  rankingEnabled?: boolean;
}) {
  const Component = gameComponents[slug];

  async function submitScoreWithFlags(
    gameSlug: string,
    nickname: string,
    score: number,
    deviceId: string
  ): Promise<void> {
    if (!rankingEnabled) {
      return;
    }
    await submitScore(gameSlug, nickname, score, deviceId);
  }

  return (
    <GameSDKProvider sdk={{ submitScore: submitScoreWithFlags }}>
      <Component />
    </GameSDKProvider>
  );
}
