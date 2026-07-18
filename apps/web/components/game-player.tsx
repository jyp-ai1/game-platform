"use client";

import { GameSDKProvider } from "@game-platform/game-sdk";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import type { PlayableSlug } from "@/lib/playable-games";
import { submitScore } from "@/lib/supabase/scores";

function Loading() {
  return (
    <p className="text-sm text-muted-foreground">게임을 불러오는 중...</p>
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
};

export function GamePlayer({ slug }: { slug: PlayableSlug }) {
  const Component = gameComponents[slug];
  return (
    <GameSDKProvider sdk={{ submitScore }}>
      <Component />
    </GameSDKProvider>
  );
}
