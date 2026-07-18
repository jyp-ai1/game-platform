"use client";

import { GameSDKProvider } from "@game-platform/game-sdk";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import type { PlayableSlug } from "@/lib/playable-games";
import { submitScore } from "@/lib/supabase/scores";

// ssr:false is required here (games use browser-only APIs like localStorage/
// keyboard events) and is only allowed inside a Client Component.
const gameComponents: Record<PlayableSlug, ComponentType> = {
  "2048": dynamic(
    () => import("@game-platform/game-2048").then((mod) => mod.Game2048),
    {
      ssr: false,
      loading: () => (
        <p className="text-sm text-muted-foreground">게임을 불러오는 중...</p>
      ),
    }
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
