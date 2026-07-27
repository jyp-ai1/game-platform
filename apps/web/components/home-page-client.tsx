"use client";

import dynamic from "next/dynamic";
import type { Game } from "@game-platform/shared";

import { HomePageSkeleton } from "@/components/home-page-skeleton";

const HomeShell = dynamic(
  () => import("@/components/home-shell").then((mod) => mod.HomeShell),
  {
    ssr: false,
    loading: () => <HomePageSkeleton />,
  }
);

export function HomePageClient({
  games,
  snakeGame,
  popular,
}: {
  games: Game[];
  snakeGame: Game | null;
  popular: Game[];
}) {
  return <HomeShell games={games} snakeGame={snakeGame} popular={popular} />;
}

/** Warm home chunk while user is in-game — avoids blank skeleton on return navigation. */
export function prefetchHomeShell(): void {
  if (typeof window === "undefined") return;
  void import("@/components/home-shell");
}
